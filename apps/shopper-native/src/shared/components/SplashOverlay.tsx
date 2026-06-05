/**
 * SplashOverlay — cinematic full-screen video intro.
 *
 * Three-phase experience:
 *   1. White hold     — matches native splash bg; zero colour flash on hand-off
 *   2. Video fade-in  — 200 ms dissolve from white once the first frame is ready
 *                       (onReadyForDisplay), preventing a blank-frame flash
 *   3. Video fade-out — 420 ms dissolve after playback ends; driven on the
 *                       UI thread so a busy JS boot doesn't stutter the exit
 *
 * Status bar hidden for the full duration → true edge-to-edge cinema view,
 * restored with a matching fade when the overlay unmounts.
 *
 * Architecture:
 *   expo-av Video        hardware-decoded MP4, zero JS-thread work
 *   Reanimated           both fade animations run as UI-thread worklets
 *   dismissedRef         prevents double-dismiss (status + timeout + error)
 *   alreadyShown guard   renders null after first session; never replays
 *   Safety timeout 6 s   always opens the app even on slow/old devices
 *   ErrorBoundary        wraps this in _layout.tsx; any crash → null fallback
 *
 * Device fitting:
 *   ResizeMode.COVER fills every aspect ratio (16:9 → 20:9+) edge-to-edge.
 *   No letterboxing. The white root backgroundColor fills any residual edges.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// ─── Timing ───────────────────────────────────────────────────────────────────

/** Video fade-in once first frame is ready. Keeps it imperceptible. */
const FADE_IN_MS  = 200;

/** Overlay fade-out after video ends. */
const FADE_OUT_MS = 420;

/**
 * Safety timeout — auto-dismiss if the video stalls or can't be decoded.
 * Generous enough for slow devices but not so long it feels broken.
 */
const TIMEOUT_MS  = 6_000;

// ─── Session guard ────────────────────────────────────────────────────────────
let alreadyShown = false;

// ─────────────────────────────────────────────────────────────────────────────

export function SplashOverlay(): React.ReactElement | null {
  const [render, setRender]        = useState(!alreadyShown);
  const dismissedRef               = useRef(false);

  // Overlay fade-out — shared value drives the Animated.View on the UI thread
  const overlayOpacity = useSharedValue(1);
  const overlayAnim    = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  // Video fade-in — starts at 0 (invisible white bg shows), fades to 1
  // when onReadyForDisplay fires so the first frame always has content
  const videoOpacity   = useSharedValue(0);
  const videoAnim      = useAnimatedStyle(() => ({ opacity: videoOpacity.value }));

  // ── dismiss ────────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    // Start the UI-thread fade animation.
    overlayOpacity.value = withTiming(0, {
      duration: FADE_OUT_MS,
      easing:   Easing.out(Easing.cubic),
    });

    // setTimeout is the PRIMARY unmount trigger — more reliable than the
    // withTiming completion callback, which can silently fail on some Android
    // devices (Reanimated worklet callback not bridging back to JS thread).
    // The +80 ms buffer lets the fade finish before the component unmounts.
    setTimeout(() => setRender(false), FADE_OUT_MS + 80);
  }, [overlayOpacity]);

  // ── Mount effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!render) return;
    alreadyShown = true;

    // ── Hide status bar for edge-to-edge immersion ──────────────────────────
    // 'fade' animates the hide/show transitions so they're not jarring.
    StatusBar.setHidden(true, "fade");

    // Safety timeout — always opens the app
    const timer = setTimeout(dismiss, TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      // Restore status bar when the overlay unmounts (after fade-out).
      StatusBar.setHidden(false, "fade");
    };
  }, [render, dismiss]);

  // ── Video callbacks ────────────────────────────────────────────────────────

  // Fires when the video surface has its first frame rendered and is ready
  // to display. We fade the video in from 0 here to prevent a blank-frame
  // flash between the white hold and the actual video content.
  const handleReadyForDisplay = useCallback(() => {
    videoOpacity.value = withTiming(1, {
      duration: FADE_IN_MS,
      easing:   Easing.out(Easing.ease),
    });
  }, [videoOpacity]);

  // onPlaybackStatusUpdate fires every ~100 ms while playing. We only act
  // when `didJustFinish` is true — the natural end of playback.
  const handleStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        dismiss();
      }
    },
    [dismiss],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!render) return null;

  return (
    <Animated.View
      style={[styles.root, overlayAnim]}
      // Default (no pointerEvents prop) = "auto" → absorbs all touches so
      // the user can't accidentally tap through to the app during the video.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* White hold layer — visible at mount before video is ready.
          Same colour as the native splash so hand-off is invisible. */}
      <View style={styles.hold} />

      {/* Video layer — initially transparent; fades in via onReadyForDisplay */}
      <Animated.View style={[styles.videoWrap, videoAnim]}>
        <Video
          source={require("../../../assets/splash-video.mp4")}

          style={styles.video}
          resizeMode={ResizeMode.COVER}

          shouldPlay           // auto-play on mount
          isLooping={false}    // play exactly once
          isMuted              // no audio during splash
          useNativeControls={false}

          onReadyForDisplay={handleReadyForDisplay}
          onPlaybackStatusUpdate={handleStatus}
          onError={dismiss}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full-screen overlay above every route. zIndex 9999 ensures it sits above
  // modals, sheets, and the notification banner.
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex:          9999,
    backgroundColor: "#ffffff",
  },

  // Hold layer: white opaque background, same colour as native splash.
  // Rendered beneath the video so there is no colour flash at any phase.
  hold: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
  },

  // Video wrapper carries the Reanimated opacity animation.
  // Must be absoluteFillObject so it covers the hold layer completely.
  videoWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  // Video itself fills its wrapper; ResizeMode.COVER handles all aspect ratios.
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});
