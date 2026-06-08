/**
 * SplashOverlay — cinematic full-screen video intro.
 *
 * Phases:
 *   1. White hold      — matches native splash; no colour flash on hand-off
 *   2. Video fade-in   — dissolve only after the first frame is drawable
 *   3. Skip pill       — quiet delayed reveal; accessible without distracting
 *   4. Video fade-out  — UI-thread withTiming over the mounted app tree
 *
 * Skip pill:
 *   • SafeAreaView (edges: top) — correct inset on any device/notch height,
 *     including Android 15 edge-to-edge, without needing initialWindowMetrics
 *   • UIText atom — Cairo font + includeFontPadding:false clipping fix
 *   • IS_RTL anchor — left edge (Arabic leading) vs right edge (English trailing)
 *   • Reanimated withSpring(0.94) scale on UI thread
 *
 * Architecture:
 *   expo-av Video       hardware-decoded MP4, zero JS-thread work
 *   ResizeMode.COVER    fills every aspect ratio edge-to-edge
 *   Reanimated          all fades + press scale run as UI-thread worklets
 *   alreadyShown guard  null-renders after first session
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { I18nManager, Pressable, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Text as UIText } from "@/shared/ui";

// ─── Timing constants ─────────────────────────────────────────────────────────
const FADE_IN_MS      = 180;
const FADE_OUT_MS     = 360;
const SKIP_DELAY_MS   = 900;
const SKIP_FADE_IN_MS = 280;

// ─── Session guard ────────────────────────────────────────────────────────────
let alreadyShown = false;

// ─── RTL flag — set synchronously at boot by i18n init ───────────────────────
const IS_RTL = I18nManager.isRTL;

// ─────────────────────────────────────────────────────────────────────────────

export function SplashOverlay(): React.ReactElement | null {
  const [render, setRender] = useState(!alreadyShown);
  const dismissedRef = useRef(false);
  const firstFrameShownRef = useRef(false);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlay exit fade
  const overlayOpacity = useSharedValue(1);
  const overlayAnim    = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  // Video enter fade — prevents blank-frame flash
  const videoOpacity = useSharedValue(0);
  const videoAnim    = useAnimatedStyle(() => ({ opacity: videoOpacity.value }));

  // Skip pill entrance
  const skipOpacity = useSharedValue(0);
  const skipAnim    = useAnimatedStyle(() => ({ opacity: skipOpacity.value }));

  // Skip pill press scale (UI-thread worklet)
  const skipScale    = useSharedValue(1);
  const skipScaleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: skipScale.value }],
  }));

  // ── dismiss ───────────────────────────────────────────────────────────────────
  const revealVideo = useCallback(() => {
    if (firstFrameShownRef.current) return;
    firstFrameShownRef.current = true;
    videoOpacity.value = withTiming(1, {
      duration: FADE_IN_MS,
      easing:   Easing.out(Easing.ease),
    });
  }, [videoOpacity]);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    skipOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
    overlayOpacity.value = withTiming(0, {
      duration: FADE_OUT_MS,
      easing:   Easing.out(Easing.cubic),
    });
    unmountTimerRef.current = setTimeout(() => setRender(false), FADE_OUT_MS + 80);
  }, [overlayOpacity, skipOpacity]);

  // ── Mount ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!render) return;
    alreadyShown = true;
    StatusBar.setHidden(true, "fade");

    const skipTimer = setTimeout(() => {
      skipOpacity.value = withTiming(1, {
        duration: SKIP_FADE_IN_MS,
        easing:   Easing.out(Easing.ease),
      });
    }, SKIP_DELAY_MS);

    return () => {
      clearTimeout(skipTimer);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
      StatusBar.setHidden(false, "fade");
    };
  }, [render, skipOpacity]);

  // ── Video callbacks ───────────────────────────────────────────────────────────
  const handleReadyForDisplay = useCallback(() => {
    revealVideo();
  }, [revealVideo]);

  const handleStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        if (status.positionMillis > 0) revealVideo();
        if (status.didJustFinish) dismiss();
        return;
      }
      if ("error" in status && status.error) dismiss();
    },
    [dismiss, revealVideo],
  );

  // ── Skip press ────────────────────────────────────────────────────────────────
  const handleSkipIn  = useCallback(() => {
    skipScale.value = withSpring(0.94, { damping: 18, stiffness: 360 });
  }, [skipScale]);
  const handleSkipOut = useCallback(() => {
    skipScale.value = withSpring(1.0, { damping: 18, stiffness: 360 });
  }, [skipScale]);

  if (!render) return null;

  return (
    <Animated.View
      style={[styles.root, overlayAnim]}
      accessible={false}
      accessibilityViewIsModal>

      {/* White hold — matches native splash bg */}
      <View style={styles.hold} />

      {/* Video layer — transparent until onReadyForDisplay */}
      <Animated.View style={[styles.videoWrap, videoAnim]}>
        <Video
          source={require("../../../assets/splash-video.mp4")}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted
          useNativeControls={false}
          onReadyForDisplay={handleReadyForDisplay}
          onPlaybackStatusUpdate={handleStatus}
          progressUpdateIntervalMillis={500}
          onError={dismiss}
        />
      </Animated.View>

      {/*
        Skip pill — SafeAreaView handles device-specific top inset correctly
        on all form factors (notch, Dynamic Island, Android edge-to-edge).
        skipSafe is absolute and full-width; skipRow aligns the pill to the
        logical trailing edge (right in LTR / left in RTL).
      */}
      <Animated.View style={[styles.skipSafe, skipAnim]}>
        <SafeAreaView edges={["top"]} style={styles.skipSafeInner}>
          <View style={[styles.skipRow, IS_RTL ? styles.skipStart : styles.skipEnd]}>
            <Pressable
              onPress={dismiss}
              onPressIn={handleSkipIn}
              onPressOut={handleSkipOut}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={IS_RTL ? "تخطى المقدمة" : "Skip intro"}
              accessibilityHint={IS_RTL ? "ينهي فيديو البداية ويفتح التطبيق" : "Ends the intro video and opens the app"}
              accessibilityElementsHidden={false}
              importantForAccessibility="yes">
              <Animated.View style={[styles.skipBtn, skipScaleAnim]}>
                <UIText variant="caption" weight="bold" color="inverse" style={styles.skipText}>
                  {IS_RTL ? "تخطى" : "Skip"}
                </UIText>
              </Animated.View>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex:          9999,
    backgroundColor: "#ffffff",
  },
  hold: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
  },
  videoWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },

  // Skip overlay: absolute, full width, above video
  skipSafe: {
    position: "absolute",
    top:      0,
    left:     0,
    right:    0,
    zIndex:   50,
  },
  skipSafeInner: {
    // SafeAreaView provides the correct top inset padding automatically
  },
  // Horizontal row: aligns pill to logical start (RTL) or end (LTR)
  skipRow: {
    flexDirection:     "row",
    paddingHorizontal: 16,
    paddingTop:        10,
  },
  skipStart: { justifyContent: "flex-start" },  // pill on LEFT  (Arabic leading edge)
  skipEnd:   { justifyContent: "flex-end"   },  // pill on RIGHT (English trailing edge)

  // Glassmorphic dark pill — Animated.View carries Reanimated scale
  skipBtn: {
    minHeight:         44,
    minWidth:          72,
    alignItems:        "center",
    justifyContent:    "center",
    backgroundColor:   "rgba(8, 22, 25, 0.46)",
    borderRadius:      22,
    paddingHorizontal: 18,
    paddingVertical:   8,
    borderWidth:       1,
    borderColor:       "rgba(255, 255, 255, 0.24)",
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 5 },
    shadowOpacity:     0.18,
    shadowRadius:      12,
    elevation:         3,
  },
  // UIText variant="caption" already sets fontSize+fontFamily; this only
  // adds letter spacing so the pill text is crisp and spaced.
  skipText: {
    includeFontPadding: false,
    letterSpacing:      0.2,
    lineHeight:         16,
    textAlignVertical:  "center",
  },
});
