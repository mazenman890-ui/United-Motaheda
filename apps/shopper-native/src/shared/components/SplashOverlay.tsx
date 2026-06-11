/**
 * SplashOverlay — premium, deterministic branded launch.
 *
 * Pipeline (see useSplashSequence for the gated state machine):
 *
 *   native splash  ─▶  BRAND reveal  ─▶  VIDEO (brand story)  ─▶  exit  ─▶  app
 *
 *   • Native → JS handoff is seamless: the JS layer paints the SAME white field
 *     with the brand mark already centred and fully opaque, so there is no
 *     opacity flash and no size pop at the moment expo-splash-screen hides.
 *   • BRAND reveal: the mark holds (matching native), then the concentric rings
 *     and wordmark choreograph in with spring physics — a deliberate, premium
 *     "wake up" rather than a static spinner.
 *   • VIDEO plays from frame 0 (declarative shouldPlay + positionMillis 0), so
 *     the user always sees the clip from the start regardless of decode speed.
 *   • Exit cross-fades the whole overlay to reveal the app/onboarding beneath.
 *
 * z-order (required): the <Video> is rendered FIRST and covered by an opaque
 * white "hold". On Android the video's SurfaceView composites independently of
 * the React tree, so a parent opacity cannot hide it — instead we fade the hold
 * OUT to reveal the already-running clip, never a black/white flicker.
 *
 * Accessibility: decorative brand visuals are hidden from screen readers; only
 * the Skip control is exposed. All entrance motion respects OS Reduce Motion —
 * with it on, elements fade in place with no spring, scale, or travel.
 */

import React, { useEffect } from "react";
import { I18nManager, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { setStatusBarHidden } from "expo-status-bar";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Text as UIText } from "@/shared/ui";
import { AppLogo } from "@/shared/components/AppLogo";
import { PressableScale } from "@/shared/motion";
import { theme } from "@/shared/theme";
import { useSplashSequence } from "./useSplashSequence";

// ─── Timeline (ms) — injected into the state machine ─────────────────────────
const MIN_BRAND_MS      = 1_100;
const LOAD_TIMEOUT_MS   = 2_600;
const VIDEO_DURATION_MS = 3_300;
const SAFETY_EXTRA_MS   = 700;
const EXIT_MS           = 380;
const HOLD_FADE_MS      = 300;
const SKIP_FADE_IN_MS   = 280;

// ─── Session guard — overlay shows once per cold launch ──────────────────────
let alreadyShown = false;

const IS_RTL = I18nManager.isRTL;

// ─────────────────────────────────────────────────────────────────────────────
// Public wrapper: owns the once-per-session guard; mounts the sequence view
// only on the first launch and unmounts it when the sequence completes.
// ─────────────────────────────────────────────────────────────────────────────
export function SplashOverlay(): React.ReactElement | null {
  const [visible, setVisible] = React.useState(!alreadyShown);

  useEffect(() => {
    if (visible) alreadyShown = true;
  }, [visible]);

  if (!visible) return null;
  return <SplashSequenceView onExited={() => setVisible(false)} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sequence view: pure presentation driven by the phase machine.
// ─────────────────────────────────────────────────────────────────────────────
function SplashSequenceView({ onExited }: { onExited: () => void }): React.ReactElement {
  const reduced = useReducedMotion();

  const seq = useSplashSequence({
    minBrandMs:      MIN_BRAND_MS,
    loadTimeoutMs:   LOAD_TIMEOUT_MS,
    videoDurationMs: VIDEO_DURATION_MS,
    safetyExtraMs:   SAFETY_EXTRA_MS,
    exitMs:          EXIT_MS,
    onExited,
  });

  // ── Animated values ──
  const overlayOpacity = useSharedValue(1);
  const holdOpacity    = useSharedValue(1);
  const skipOpacity    = useSharedValue(0);

  // Brand mark is present immediately (seamless native handoff); rings + wordmark
  // choreograph in after a beat.
  const ringsScale  = useSharedValue(reduced ? 1 : 0.86);
  const ringsOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const wordShift   = useSharedValue(reduced ? 0 : 10);

  const overlayAnim = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const holdAnim    = useAnimatedStyle(() => ({ opacity: holdOpacity.value }));
  const skipAnim    = useAnimatedStyle(() => ({ opacity: skipOpacity.value }));
  const ringsAnim   = useAnimatedStyle(() => ({
    opacity:   ringsOpacity.value,
    transform: [{ scale: ringsScale.value }],
  }));
  const wordAnim    = useAnimatedStyle(() => ({
    opacity:   wordOpacity.value,
    transform: [{ translateY: wordShift.value }],
  }));

  // ── Status bar: hide during the cinematic, restore on teardown ──
  useEffect(() => {
    setStatusBarHidden(true, "fade");
    return () => setStatusBarHidden(false, "fade");
  }, []);

  // ── Brand entrance (mount) ──
  useEffect(() => {
    if (reduced) {
      ringsOpacity.value = withTiming(1, { duration: 220 });
      wordOpacity.value  = withDelay(120, withTiming(1, { duration: 220 }));
      return;
    }
    ringsOpacity.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
    ringsScale.value   = withSpring(1, { damping: 20, stiffness: 110, mass: 1.4 });
    wordOpacity.value  = withDelay(220, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    wordShift.value    = withDelay(220, withSpring(0, theme.animation.spring.gentle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── React to phase transitions ──
  useEffect(() => {
    if (seq.phase === "video") {
      holdOpacity.value = withTiming(0, { duration: HOLD_FADE_MS, easing: Easing.in(Easing.ease) });
      skipOpacity.value = withTiming(1, { duration: SKIP_FADE_IN_MS, easing: Easing.out(Easing.ease) });
    } else if (seq.phase === "exiting") {
      skipOpacity.value    = withTiming(0, { duration: 160 });
      overlayOpacity.value = withTiming(0, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq.phase]);

  // ── Video status bridge ──
  const handleStatus = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      seq.notifyVideoLoaded();
      if (status.didJustFinish) seq.notifyVideoFinished();
      return;
    }
    if ("error" in status && status.error) seq.notifyVideoError();
  };

  return (
    <Animated.View style={[styles.root, overlayAnim]} accessibilityViewIsModal>
      {/* Video — under the hold; plays from frame 0 once the machine allows. */}
      <Video
        source={require("../../../assets/splash-video.mp4")}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={seq.videoShouldPlay}
        positionMillis={0}
        isLooping={false}
        isMuted
        useNativeControls={false}
        onLoad={seq.notifyVideoLoaded}
        onReadyForDisplay={seq.notifyVideoLoaded}
        onPlaybackStatusUpdate={handleStatus}
        progressUpdateIntervalMillis={250}
        onError={seq.notifyVideoError}
      />

      {/* White brand hold — covers the video until the video phase. Decorative. */}
      <Animated.View
        style={[styles.hold, holdAnim]}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        <View style={styles.holdBrand}>
          <Animated.View style={[styles.ringOuter, ringsAnim]} />
          <Animated.View style={[styles.ringInner, ringsAnim]} />
          <Animated.View style={[styles.ringCore,  ringsAnim]} />

          {/* Mark — opaque from frame 0 for a seamless native handoff. */}
          <View style={styles.logoTile}>
            <AppLogo size="lg" />
          </View>

          <Animated.View style={[styles.wordmark, wordAnim]}>
            <UIText weight="black" style={styles.brandName}>United Pharmacy</UIText>
            <View style={styles.brandDot} />
            <UIText variant="caption" style={styles.brandSub}>
              {IS_RTL ? "متجر أدويتك الموثوق" : "Your trusted pharmacy"}
            </UIText>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Skip — appears with the video; trailing edge per direction. */}
      <Animated.View style={[styles.skipSafe, skipAnim]}>
        <SafeAreaView edges={["top"]}>
          <View style={[styles.skipRow, IS_RTL ? styles.skipStart : styles.skipEnd]}>
            <PressableScale
              onPress={seq.skip}
              scaleTo={0.94}
              hitSlop={12}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel={IS_RTL ? "تخطّي المقدمة" : "Skip intro"}
              accessibilityHint={IS_RTL ? "ينهي فيديو البداية ويفتح التطبيق" : "Ends the intro video and opens the app"}>
              <UIText weight="bold" color="inverse" style={styles.skipText}>
                {IS_RTL ? "تخطّي" : "Skip"}
              </UIText>
            </PressableScale>
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
  video: { ...StyleSheet.absoluteFillObject },
  hold: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
  },

  holdBrand: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            22,
  },

  ringOuter: {
    position:     "absolute",
    width:        224,
    height:       224,
    borderRadius: 112,
    borderWidth:  1.5,
    borderColor:  "rgba(13,184,168,0.12)",
  },
  ringInner: {
    position:     "absolute",
    width:        164,
    height:       164,
    borderRadius: 82,
    borderWidth:  1.5,
    borderColor:  "rgba(13,184,168,0.20)",
  },
  ringCore: {
    position:     "absolute",
    width:        120,
    height:       120,
    borderRadius: 60,
    borderWidth:  1,
    borderColor:  "rgba(13,184,168,0.28)",
  },

  logoTile: {
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
  wordmark: {
    alignItems: "center",
    gap:        4,
  },
  brandName: {
    fontSize:           22,
    color:              "#021D2E",
    letterSpacing:      -0.6,
    includeFontPadding: false,
    lineHeight:         28,
  },
  brandDot: {
    width:           5,
    height:          5,
    borderRadius:    2.5,
    backgroundColor: "rgba(13,184,168,0.50)",
    marginVertical:  2,
  },
  brandSub: {
    color:              "rgba(2,29,46,0.44)",
    includeFontPadding: false,
    lineHeight:         16,
    textAlign:          "center",
  },

  skipSafe: {
    position: "absolute",
    top:      0,
    left:     0,
    right:    0,
    zIndex:   50,
  },
  skipRow: {
    flexDirection:     "row",
    paddingHorizontal: 16,
    paddingTop:        10,
  },
  skipStart: { justifyContent: "flex-start" },  // Arabic leading edge (left)
  skipEnd:   { justifyContent: "flex-end"   },  // English trailing edge (right)

  skipBtn: {
    minHeight:         44,
    minWidth:          84,
    alignItems:        "center",
    justifyContent:    "center",
    backgroundColor:   "rgba(8, 22, 25, 0.46)",
    borderRadius:      22,
    paddingHorizontal: 20,
    paddingVertical:   9,
    borderWidth:       1,
    borderColor:       "rgba(255, 255, 255, 0.24)",
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 5 },
    shadowOpacity:     0.18,
    shadowRadius:      12,
    elevation:         3,
  },
  // No letterSpacing + horizontal padding → Android never clips the trailing
  // Arabic glyph of "تخطّي"; lineHeight gives descenders headroom.
  skipText: {
    fontSize:           13,
    lineHeight:         20,
    paddingHorizontal:  3,
    includeFontPadding: false,
    textAlign:          "center",
    textAlignVertical:  "center",
  },
});
