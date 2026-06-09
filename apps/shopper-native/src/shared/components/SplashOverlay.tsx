/**
 * SplashOverlay — cinematic full-screen video intro.
 *
 * Phases:
 *   1. White hold      — matches native splash; no colour flash on hand-off
 *   2. Video reveal    — hold fades OUT once first frame is confirmed drawable
 *   3. Skip pill       — quiet delayed reveal; accessible without distracting
 *   4. Overlay exit    — UI-thread withTiming fades entire overlay to 0
 *
 * Root-cause fix (black-screen issue):
 *   Previously the white hold View was rendered BEFORE the Animated video
 *   wrapper, making it sit BEHIND the video in z-order. The Video component
 *   uses a hardware-accelerated native surface (SurfaceView on Android,
 *   AVPlayerLayer on iOS). On Android, SurfaceView composites independently
 *   of the React shadow tree — opacity:0 on a parent Animated.View does NOT
 *   hide the native surface, so the black compositor rect bled through while
 *   the video was loading.
 *
 *   Fix: render the <Video> first (lower z-order), then place the white hold
 *   Animated.View AFTER it (higher z-order). When the first frame is confirmed
 *   via onReadyForDisplay / positionMillis>0, fade the hold OUT to reveal the
 *   already-playing video underneath. The user always sees white until the
 *   video frame is truly ready — no black flash, no timing race.
 *
 * Safety valve:
 *   After revealVideo() fires we know the video is playing. A safety timeout
 *   set to VIDEO_DURATION_MS + 600 ms auto-dismisses if didJustFinish never
 *   fires (observed on certain Android OEMs with expo-av). This guarantees the
 *   overlay never gets stuck even when expo-av misbehaves.
 *
 * Skip pill:
 *   • SafeAreaView (edges: top) — correct inset on any device/notch height,
 *     including Android 15 edge-to-edge, without needing initialWindowMetrics
 *   • UIText atom — Cairo font + includeFontPadding:false clipping fix
 *   • IS_RTL anchor — left edge (Arabic leading) vs right edge (English trailing)
 *   • Reanimated withSpring(0.94) scale on UI thread
 *
 * Hold screen enhancements (2026):
 *   • Three concentric animated rings — spring in on mount for a premium
 *     branded moment instead of a static loading screen.
 *   • holdDot — small teal separator dot between name and subtitle.
 *   • holdLogoTile — deeper shadow, hairline teal border, larger radius.
 *   • holdName — larger (22px), tighter letterSpacing (-0.6).
 *
 * Architecture:
 *   expo-av Video       hardware-decoded MP4, zero JS-thread work
 *   ResizeMode.COVER    fills every aspect ratio edge-to-edge
 *   Reanimated          all fades + press scale run as UI-thread worklets
 *   alreadyShown guard  null-renders after first session
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { I18nManager, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { setStatusBarHidden } from "expo-status-bar";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Text as UIText } from "@/shared/ui";
import { AppLogo } from "@/shared/components/AppLogo";
import { theme } from "@/shared/theme";

// ─── Timing constants ─────────────────────────────────────────────────────────
const VIDEO_DURATION_MS   = 3_300;   // actual video length (3.3 s @ 30 fps)
const HOLD_FADE_MS        = 220;     // hold fades OUT to reveal video
const FADE_OUT_MS         = 360;     // entire overlay exits
const SKIP_DELAY_MS       = 900;     // skip pill appears after this many ms
const SKIP_FADE_IN_MS     = 280;
const SAFETY_EXTRA_MS     = 600;     // buffer past VIDEO_DURATION_MS before force-dismiss

// ─── Session guard ────────────────────────────────────────────────────────────
let alreadyShown = false;

// ─── RTL flag — set synchronously at boot by i18n init ───────────────────────
const IS_RTL = I18nManager.isRTL;

// ─────────────────────────────────────────────────────────────────────────────

export function SplashOverlay(): React.ReactElement | null {
  const [render, setRender]        = useState(!alreadyShown);
  const dismissedRef               = useRef(false);
  const firstFrameShownRef         = useRef(false);
  const unmountTimerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlay exit fade — applied to the entire root Animated.View
  const overlayOpacity = useSharedValue(1);
  const overlayAnim    = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  // Hold layer — starts fully opaque (white, covers the video's black surface),
  // fades OUT when the first video frame is confirmed ready.
  const holdOpacity = useSharedValue(1);
  const holdAnim    = useAnimatedStyle(() => ({ opacity: holdOpacity.value }));

  // Skip pill entrance
  const skipOpacity = useSharedValue(0);
  const skipAnim    = useAnimatedStyle(() => ({ opacity: skipOpacity.value }));

  // Branded hold content — springs in immediately on mount
  const logoScale   = useSharedValue(0.86);
  const logoOpacity = useSharedValue(0);
  const logoAnim    = useAnimatedStyle(() => ({
    opacity:   logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  // Skip pill press scale (UI-thread worklet)
  const skipScale     = useSharedValue(1);
  const skipScaleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: skipScale.value }],
  }));

  // ── Concentric ring animations — spring in on mount for premium brand moment
  // ring1 (outer): damping 22, stiffness 120, mass 1.4
  const ring1Scale = useSharedValue(0.92);
  const ring1Anim  = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }] }));

  // ring2 (inner): damping 20, stiffness 100, mass 1.6, 80ms delay
  const ring2Scale = useSharedValue(0.88);
  const ring2Anim  = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }] }));

  // ring3 (core): slightly more compressed start, 160ms delay
  const ring3Scale = useSharedValue(0.84);
  const ring3Anim  = useAnimatedStyle(() => ({ transform: [{ scale: ring3Scale.value }] }));

  // ── dismiss — defined first so revealVideo can reference it ────────────────
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    skipOpacity.value    = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
    overlayOpacity.value = withTiming(0, {
      duration: FADE_OUT_MS,
      easing:   Easing.out(Easing.cubic),
    });
    unmountTimerRef.current = setTimeout(() => setRender(false), FADE_OUT_MS + 80);
  }, [overlayOpacity, skipOpacity]);

  // ── revealVideo — fade the hold OUT, revealing the playing video beneath ────
  //    Also arms the safety timer: if didJustFinish never fires (expo-av bug on
  //    some Android OEMs), the overlay auto-dismisses after the video duration.
  const revealVideo = useCallback(() => {
    if (firstFrameShownRef.current) return;
    firstFrameShownRef.current = true;
    holdOpacity.value = withTiming(0, {
      duration: HOLD_FADE_MS,
      easing:   Easing.in(Easing.ease),
    });
    safetyTimerRef.current = setTimeout(dismiss, VIDEO_DURATION_MS + SAFETY_EXTRA_MS);
  }, [holdOpacity, dismiss]);

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!render) return;
    alreadyShown = true;
    setStatusBarHidden(true, "fade");

    // Branded hold content springs in immediately — visible while video loads
    logoOpacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    logoScale.value   = withSpring(1, theme.animation.spring.gentle);

    // Concentric rings spring in: each with increasing delay for a ripple effect.
    // withDelay is used because Reanimated spring configs have no `delay` field.
    ring1Scale.value = withSpring(1, { damping: 22, stiffness: 120, mass: 1.4 });
    ring2Scale.value = withDelay(80,  withSpring(1, { damping: 20, stiffness: 100, mass: 1.6 }));
    ring3Scale.value = withDelay(160, withSpring(1, { damping: 18, stiffness: 90,  mass: 1.8 }));

    const skipTimer = setTimeout(() => {
      skipOpacity.value = withTiming(1, {
        duration: SKIP_FADE_IN_MS,
        easing:   Easing.out(Easing.ease),
      });
    }, SKIP_DELAY_MS);

    return () => {
      clearTimeout(skipTimer);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
      if (safetyTimerRef.current)  clearTimeout(safetyTimerRef.current);
      setStatusBarHidden(false, "fade");
    };
  }, [render, skipOpacity]);

  // ── Video callbacks ───────────────────────────────────────────────────────
  const handleReadyForDisplay = useCallback(() => {
    revealVideo();
  }, [revealVideo]);

  const handleStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        if (status.positionMillis > 0) revealVideo();
        if (status.didJustFinish)      dismiss();
        return;
      }
      if ("error" in status && status.error) dismiss();
    },
    [dismiss, revealVideo],
  );

  // ── Skip press ────────────────────────────────────────────────────────────
  const handleSkipIn  = useCallback(() => {
    skipScale.value = withSpring(0.94, { damping: 18, stiffness: 360 });
  }, [skipScale]);
  const handleSkipOut = useCallback(() => {
    skipScale.value = withSpring(1.0,  { damping: 18, stiffness: 360 });
  }, [skipScale]);

  if (!render) return null;

  return (
    <Animated.View
      style={[styles.root, overlayAnim]}
      accessible={false}
      accessibilityViewIsModal>

      {/*
        Video — rendered FIRST (lower z-order).
        Always playing from mount; the white hold above covers it until the
        first frame is confirmed ready via onReadyForDisplay / positionMillis.
      */}
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

      {/*
        White hold — rendered AFTER the video (higher z-order in the compositor).
        Starts fully opaque so the user sees white (matching the native splash)
        while the video's hardware surface initialises. Fades to opacity 0 once
        the first frame is confirmed — revealing the already-playing video beneath.

        Contains a branded logo mark that springs in during the load window,
        replacing the previous blank-white hold with a premium brand moment.
        pointerEvents="none" so it never swallows taps intended for the skip pill.
      */}
      <Animated.View style={[styles.hold, holdAnim]} pointerEvents="none">
        <Animated.View style={[styles.holdBrand, logoAnim]}>
          {/*
            Animated concentric ring accents — spring in on mount with staggered
            delays for a ripple/pulse effect that feels premium and alive.
          */}
          <Animated.View style={[styles.holdRingOuter, ring1Anim]} />
          <Animated.View style={[styles.holdRingInner, ring2Anim]} />
          <Animated.View style={[styles.holdRingCore,  ring3Anim]} />

          {/* Logo tile — deeper shadow, hairline teal border, larger radius */}
          <View style={styles.holdLogoTile}>
            <AppLogo size="lg" />
          </View>

          {/* Brand wordmark — name · holdDot · subtitle */}
          <View style={styles.holdWordmark}>
            <UIText weight="black" style={styles.holdName}>United Pharmacy</UIText>
            {/* holdDot: small teal separator between name and subtitle */}
            <View style={styles.holdDot} />
            <UIText variant="caption" style={styles.holdSub}>
              {IS_RTL ? "متجر أدويتك الموثوق" : "Your trusted pharmacy"}
            </UIText>
          </View>
        </Animated.View>
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
  // Video at the back — hardware surface renders here; hold covers it initially
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  // Hold on top — white layer matching native splash; fades out on video ready.
  // Children are the branded logo mark that appears while the video loads.
  hold: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
  },

  // Branded hold content — centered logo + wordmark
  holdBrand: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            22,
  },

  // ── Concentric animated ring halos ──
  // holdRingOuter: 224×224, borderWidth 1.5, borderColor at 12% opacity
  holdRingOuter: {
    position:        "absolute",
    width:           224,
    height:          224,
    borderRadius:    112,
    borderWidth:     1.5,
    borderColor:     "rgba(13,184,168,0.12)",
  },
  // holdRingInner: 164×164, borderWidth 1.5, borderColor at 20% opacity
  holdRingInner: {
    position:        "absolute",
    width:           164,
    height:          164,
    borderRadius:    82,
    borderWidth:     1.5,
    borderColor:     "rgba(13,184,168,0.20)",
  },
  // holdRingCore: 120×120, borderWidth 1, borderColor at 28% opacity — most saturated
  holdRingCore: {
    position:        "absolute",
    width:           120,
    height:          120,
    borderRadius:    60,
    borderWidth:     1,
    borderColor:     "rgba(13,184,168,0.28)",
  },

  // Logo tile — borderRadius 36, hairline teal border, deeper shadow for premium lift
  holdLogoTile: {
    width:           108,
    height:          108,
    borderRadius:    36,
    overflow:        "hidden",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#FFFFFF",
    borderWidth:     1,
    borderColor:     "rgba(13,184,168,0.14)",
    shadowColor:     "#021D2E",
    shadowOffset:    { width: 0, height: 12 },
    shadowOpacity:   0.16,
    shadowRadius:    28,
    elevation:       14,
  },
  holdWordmark: {
    alignItems: "center",
    gap:        4,
  },
  // holdName: 22px (was 20), letterSpacing -0.6 (was -0.5) — cleaner wordmark
  holdName: {
    fontSize:           22,
    color:              "#021D2E",
    letterSpacing:      -0.6,
    includeFontPadding: false,
    lineHeight:         28,
  },
  // holdDot: small teal separator dot between name and subtitle
  holdDot: {
    width:           5,
    height:          5,
    borderRadius:    2.5,
    backgroundColor: "rgba(13,184,168,0.50)",
    marginVertical:  2,
  },
  // holdSub: slightly dimmer (0.44 vs 0.48) — cleaner hierarchy
  holdSub: {
    color:              "rgba(2,29,46,0.44)",
    includeFontPadding: false,
    lineHeight:         16,
    textAlign:          "center",
  },

  // Skip overlay: absolute, full width, above everything else
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
  skipText: {
    includeFontPadding: false,
    letterSpacing:      0.2,
    lineHeight:         16,
    textAlignVertical:  "center",
  },
});
