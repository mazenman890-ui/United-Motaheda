/**
 * SplashOverlay — cinematic full-screen video intro.
 *
 * Four-phase experience:
 *   1. White hold      — matches native splash bg; zero colour flash on hand-off
 *   2. Video fade-in   — 200 ms dissolve from white once the first frame is ready
 *                        (onReadyForDisplay), preventing a blank-frame flash
 *   3. Skip pill       — glassmorphic pill fades in after 1.5 s so users see the
 *                        video before the option to skip appears
 *   4. Video fade-out  — 420 ms dissolve driven on the UI thread; JS thread is
 *                        never involved in the exit animation
 *
 * Status bar hidden for the full duration → true edge-to-edge cinema view,
 * restored with a matching fade when the overlay unmounts.
 *
 * Architecture:
 *   expo-av Video        hardware-decoded MP4, zero JS-thread work
 *   ResizeMode.COVER     fills every aspect ratio (16:9 → 20:9+) edge-to-edge
 *   Reanimated           all fade animations run as UI-thread worklets
 *   dismissedRef         prevents double-dismiss (status + error + skip)
 *   alreadyShown guard   renders null after first session; never replays
 *   onError → dismiss    resilient: hardware decode failure still opens app
 *   No hard timeout      video plays to natural completion; skip provides user
 *                        escape if something stalls
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics } from "react-native-safe-area-context";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// ─── Timing constants ─────────────────────────────────────────────────────────

/** Video fades in from white once the first frame is decoded. */
const FADE_IN_MS       = 200;

/** Overlay fades out after natural video end or skip press. */
const FADE_OUT_MS      = 420;

/**
 * Delay before the Skip pill appears.
 * 1.5 s — ensures users see a meaningful portion of the video
 * before the option to skip is offered. Not too long to feel trapped.
 */
const SKIP_DELAY_MS    = 1_500;

/** Skip pill itself fades in over 350 ms once the delay elapses. */
const SKIP_FADE_IN_MS  = 350;

// ─── Session guard ────────────────────────────────────────────────────────────
// Module-level flag: replays are blocked even across hot reloads during dev.
let alreadyShown = false;

// ─────────────────────────────────────────────────────────────────────────────

// Module-level — no provider needed. SplashOverlay is intentionally mounted
// outside SafeAreaProvider in _layout.tsx; useSafeAreaInsets() would throw.
// initialWindowMetrics is populated synchronously before any JS runs.
const TOP_INSET = (initialWindowMetrics?.insets.top ?? 44) + 16;

export function SplashOverlay(): React.ReactElement | null {
  const [render, setRender] = useState(!alreadyShown);
  const dismissedRef = useRef(false);

  // ── Overlay (exit) fade — drives the whole overlay off the screen ────────────
  const overlayOpacity = useSharedValue(1);
  const overlayAnim    = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  // ── Video (enter) fade — prevents blank-frame flash at video start ───────────
  const videoOpacity = useSharedValue(0);
  const videoAnim    = useAnimatedStyle(() => ({ opacity: videoOpacity.value }));

  // ── Skip pill fade — delayed entrance so the video gets a fair showing ───────
  const skipOpacity = useSharedValue(0);
  const skipAnim    = useAnimatedStyle(() => ({ opacity: skipOpacity.value }));

  // ── dismiss ───────────────────────────────────────────────────────────────────
  // Safe to call from any trigger (natural end, skip press, error).
  // dismissedRef prevents running the exit sequence more than once.
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    // Fade skip pill out first for a clean exit (runs on UI thread).
    skipOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });

    // Fade overlay out — UI-thread worklet, immune to JS thread congestion.
    overlayOpacity.value = withTiming(0, {
      duration: FADE_OUT_MS,
      easing:   Easing.out(Easing.cubic),
    });

    // setTimeout is the PRIMARY unmount signal — more reliable than the
    // Reanimated withTiming callback, which can silently drop on some
    // Android devices when the bridge is under load at app boot.
    // +80 ms buffer ensures the CSS-style fade completes before unmount.
    setTimeout(() => setRender(false), FADE_OUT_MS + 80);
  }, [overlayOpacity, skipOpacity]);

  // ── Mount effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!render) return;
    alreadyShown = true;

    // Hide status bar — true edge-to-edge cinema view.
    // 'fade' keeps the transition imperceptible.
    StatusBar.setHidden(true, "fade");

    // Fade the Skip pill in after SKIP_DELAY_MS — users see the video first.
    const skipTimer = setTimeout(() => {
      skipOpacity.value = withTiming(1, {
        duration: SKIP_FADE_IN_MS,
        easing:   Easing.out(Easing.ease),
      });
    }, SKIP_DELAY_MS);

    return () => {
      clearTimeout(skipTimer);
      // Restore status bar on unmount (called after the fade-out completes).
      StatusBar.setHidden(false, "fade");
    };
  }, [render, dismiss, skipOpacity]);

  // ── Video callbacks ───────────────────────────────────────────────────────────

  // onReadyForDisplay fires when the first decoded frame hits the surface.
  // We fade the video layer in here to guarantee no blank-frame flash.
  const handleReadyForDisplay = useCallback(() => {
    videoOpacity.value = withTiming(1, {
      duration: FADE_IN_MS,
      easing:   Easing.out(Easing.ease),
    });
  }, [videoOpacity]);

  // Fires every ~100 ms. We only act when the video reaches natural end.
  const handleStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) dismiss();
    },
    [dismiss],
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  if (!render) return null;

  return (
    <Animated.View
      style={[styles.root, overlayAnim]}
      // Absorbs all touches so users can't tap through to the app during
      // the video. The Skip button is an explicit Pressable child that
      // intercepts its own region before the parent absorbs the rest.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* 1 — White hold: same colour as native splash → invisible hand-off */}
      <View style={styles.hold} />

      {/* 2 — Video layer: initially transparent, fades in on first frame */}
      <Animated.View style={[styles.videoWrap, videoAnim]}>
        <Video
          source={require("../../../assets/splash-video.mp4")}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay          // auto-play on mount
          isLooping={false}   // play exactly once
          isMuted             // silent during splash — no unexpected audio
          useNativeControls={false}
          onReadyForDisplay={handleReadyForDisplay}
          onPlaybackStatusUpdate={handleStatus}
          onError={dismiss}   // hardware decode failure → open app gracefully
        />
      </Animated.View>

      {/* 3 — Skip pill: glassmorphic, top-right, delayed entrance
              Placed after videoWrap in the tree so it renders above the video.
              Pressable intercepts touches in its bounds; the overlay absorbs
              everything else so the app below stays untouched.               */}
      <Animated.View
        style={[
          styles.skipWrap,
          skipAnim,
          { top: TOP_INSET },
        ]}
        // Allow screen readers to access this button even though the parent
        // hides descendants — it's the only interactive element.
        accessibilityElementsHidden={false}
        importantForAccessibility="yes"
      >
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="تخطى المقدمة"
          style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
        >
          <Text style={styles.skipText}>تخطى</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full-screen overlay. zIndex 9999 sits above every modal, sheet,
  // and notification banner the app might render during cold start.
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex:          9999,
    backgroundColor: "#ffffff",
  },

  // White hold layer — same colour as native splash & app.json splash bg.
  // Rendered beneath everything so there is never a colour flash at any phase.
  hold: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
  },

  // Video wrapper carries the Reanimated fade-in animation.
  // absoluteFillObject ensures it covers the hold layer completely.
  videoWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  // Video fills its wrapper; ResizeMode.COVER handles every aspect ratio.
  video: {
    ...StyleSheet.absoluteFillObject,
  },

  // Skip pill wrapper — absolute, right-aligned, z above video.
  skipWrap: {
    position: "absolute",
    right:    16,
    zIndex:   50,
  },

  // Glassmorphic dark pill — readable over any video content, light or dark.
  skipBtn: {
    backgroundColor:   "rgba(0, 0, 0, 0.42)",
    borderRadius:      20,
    paddingHorizontal: 18,
    paddingVertical:   9,
    borderWidth:       1,
    borderColor:       "rgba(255, 255, 255, 0.18)",
    // Subtle shadow so the pill lifts off bright backgrounds
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.25,
    shadowRadius:      6,
    elevation:         4,
  },

  // Pressed state — slight opacity pull-back (no scale needed for a pill)
  skipBtnPressed: {
    opacity: 0.72,
  },

  // Skip label — white, bold, slightly tracked
  skipText: {
    color:       "#ffffff",
    fontSize:    13,
    fontWeight:  "700",
    letterSpacing: 0.3,
  },
});
