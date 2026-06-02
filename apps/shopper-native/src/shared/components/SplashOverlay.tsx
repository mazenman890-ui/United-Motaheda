/**
 * SplashOverlay — premium animated splash.
 *
 * Sits above the route tree, fades out as the JS bundle settles. Every
 * animation runs on the UI thread (Reanimated worklets) so a busy JS
 * thread during boot doesn't drop frames.
 *
 * IMPORTANT — hook safety:
 *   This component conditionally returns null after the fade-out. Every
 *   hook in the body must therefore have a STABLE COUNT across renders.
 *   The 9 per-cell `useAnimatedStyle` calls live inside the <GridCell />
 *   subcomponent, NOT in a .map() in the parent's render path — otherwise
 *   the post-fade render would call fewer hooks and trip React's check.
 *
 * Staged choreography:
 *   0    ms   nothing visible (overlay opaque white)
 *   80   ms   ambient gradient pulse begins (looping; GPU-driven)
 *   120  ms   eyebrow ("Welcome to") fades + slides up
 *   180  ms   logo scales from 0.84 → 1, opacity 0 → 1
 *   320  ms   title block fades + slides up
 *   440  ms   divider expands from 0 → 64px
 *   520  ms   icon grid cells stagger in (60ms apart)
 *   200..900ms hydration bar fills 0 → 100%
 *   900  ms   HOLD_MS reached → fade overlay out over 350ms
 *
 * Offline at boot: the eyebrow swaps to an "offline" copy.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { onlineManager } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { Text } from "@/shared/ui";
import { recordDuration, addBreadcrumb } from "@/features/observability";

const HOLD_MS    = 900;
const FADE_MS    = 350;
const STAGGER_MS = 60;
const CELL_COUNT = 9;

/** Module-level guard — shows once per JS bundle session. */
let alreadyShown = false;

type IconSpec =
  | { lib: "mc"; name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; accent?: boolean }
  | { lib: "io"; name: React.ComponentProps<typeof Ionicons>["name"]; accent?: boolean };

const ICONS: IconSpec[] = [
  { lib: "mc", name: "heart-pulse"   },
  { lib: "mc", name: "atom"          },
  { lib: "mc", name: "dna"           },
  { lib: "mc", name: "flask"         },
  { lib: "mc", name: "pill"          },
  { lib: "mc", name: "stethoscope"   },
  { lib: "mc", name: "needle"        },
  { lib: "mc", name: "hand-heart", accent: true },
  { lib: "io", name: "medkit"        },
];

export function SplashOverlay(): React.ReactElement | null {
  const { t }               = useTranslation();
  const [render, setRender] = useState(!alreadyShown);
  const [offline]           = useState(() => !onlineManager.isOnline());

  // ── Top-level shared values — fixed count across renders ──────────────────
  const opacity     = useSharedValue(1);
  const eyebrowProg = useSharedValue(0);
  const logoProg    = useSharedValue(0);
  const titleProg   = useSharedValue(0);
  const dividerProg = useSharedValue(0);
  const ambient     = useSharedValue(0);
  const progressVal = useSharedValue(0);

  // 9 fixed-count shared values for the grid cells. Hoisted out of the
  // render path so the cell sub-component owns its own animated style.
  const gridProg0 = useSharedValue(0);
  const gridProg1 = useSharedValue(0);
  const gridProg2 = useSharedValue(0);
  const gridProg3 = useSharedValue(0);
  const gridProg4 = useSharedValue(0);
  const gridProg5 = useSharedValue(0);
  const gridProg6 = useSharedValue(0);
  const gridProg7 = useSharedValue(0);
  const gridProg8 = useSharedValue(0);

  const gridProgs = useMemo<SharedValue<number>[]>(
    () => [gridProg0, gridProg1, gridProg2, gridProg3, gridProg4, gridProg5, gridProg6, gridProg7, gridProg8],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Top-level animated styles — also fixed count ──────────────────────────
  const overlayAnim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const eyebrowAnim = useAnimatedStyle(() => ({
    opacity:   eyebrowProg.value,
    transform: [{ translateY: (1 - eyebrowProg.value) * 6 }],
  }));
  const logoAnim = useAnimatedStyle(() => ({
    opacity:   logoProg.value,
    transform: [{ scale: 0.84 + 0.16 * logoProg.value }],
  }));
  const titleAnim = useAnimatedStyle(() => ({
    opacity:   titleProg.value,
    transform: [{ translateY: (1 - titleProg.value) * 6 }],
  }));
  const dividerAnim = useAnimatedStyle(() => ({
    width:   64 * dividerProg.value,
    opacity: dividerProg.value,
  }));
  const progressAnim = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressVal.value }],
  }));
  const ambientAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 + 6 * ambient.value }],
  }));

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!render) return;
    alreadyShown = true;
    const startedAt = Date.now();

    const ease  = Easing.out(Easing.cubic);
    const easeI = Easing.inOut(Easing.quad);

    eyebrowProg.value = withDelay(120, withTiming(1, { duration: 280, easing: ease }));
    logoProg.value    = withDelay(180, withTiming(1, { duration: 340, easing: ease }));
    titleProg.value   = withDelay(320, withTiming(1, { duration: 280, easing: ease }));
    dividerProg.value = withDelay(440, withTiming(1, { duration: 260, easing: easeI }));

    for (let i = 0; i < CELL_COUNT; i++) {
      gridProgs[i].value = withDelay(
        520 + i * STAGGER_MS,
        withTiming(1, { duration: 280, easing: ease }),
      );
    }

    ambient.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: easeI }),
        withTiming(0, { duration: 2200, easing: easeI }),
      ),
      -1,
      false,
    );

    progressVal.value = withSequence(
      withTiming(0.9, { duration: HOLD_MS - 60, easing: Easing.out(Easing.quad) }),
      withTiming(1.0, { duration: 60, easing: Easing.linear }),
    );

    opacity.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(handleHidden)(Date.now() - startedAt);
      }),
    );

    return () => {
      cancelAnimation(ambient);
      cancelAnimation(progressVal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  const handleHidden = (totalMs: number) => {
    recordDuration("splash.total_ms", totalMs);
    addBreadcrumb({
      category: "nav",
      level:    "info",
      message:  "splash hidden",
      data:     { ms: totalMs, offline },
    });
    setRender(false);
  };

  if (!render) return null;

  return (
    <Animated.View
      // pointerEvents must live on style (React Native deprecated the prop).
      style={[StyleSheet.absoluteFillObject, styles.root, overlayAnim, styles.noTouch]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, ambientAnim]}>
        <LinearGradient
          colors={["#FFFFFF", theme.colors.teal[25], theme.colors.teal[50], "#D8F2EE"]}
          locations={[0, 0.45, 0.78, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={eyebrowAnim}>
          <Text
            variant="caption"
            color="tertiary"
            align="center"
            style={{ letterSpacing: 1.4 }}
          >
            {offline ? t("splash.offline") : t("splash.welcome")}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.logoWrap, logoAnim]}>
          <Image
            source={require("../../../assets/brand-mark.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>

        <Animated.View style={titleAnim}>
          <Text variant="screen-title" align="center" style={{ marginTop: theme.spacing[1] }}>
            {t("splash.appName")}
          </Text>
          <Text
            variant="caption"
            color="secondary"
            align="center"
            style={{ marginTop: 2, letterSpacing: 0.8 }}
          >
            United Pharmacy
          </Text>
        </Animated.View>

        <Animated.View style={[styles.divider, dividerAnim]} />

        <View style={styles.grid}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.gridRow}>
              {[0, 1, 2].map((col) => {
                const idx  = row * 3 + col;
                const cell = ICONS[idx];
                return (
                  <GridCell
                    key={col}
                    prog={gridProgs[idx]}
                    icon={cell}
                    borderEnd={col < 2}
                    borderBottom={row < 2}
                  />
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressAnim]} />
        </View>
      </View>
    </Animated.View>
  );
}

// ─── GridCell ────────────────────────────────────────────────────────────────
// Owns its own animated style so the parent's hook count stays fixed.

interface GridCellProps {
  prog:         SharedValue<number>;
  icon:         IconSpec;
  borderEnd:    boolean;
  borderBottom: boolean;
}

const GridCell = React.memo(function GridCell({ prog, icon, borderEnd, borderBottom }: GridCellProps) {
  const animStyle = useAnimatedStyle(() => ({
    opacity:   prog.value,
    transform: [{ scale: 0.92 + 0.08 * prog.value }],
  }));
  const tint = icon.accent ? theme.colors.text.primary : theme.colors.brand.base;
  return (
    <Animated.View
      style={[
        styles.gridCell,
        borderEnd    && styles.gridCellBorderEnd,
        borderBottom && styles.gridCellBorderBottom,
        animStyle,
      ]}
    >
      {icon.lib === "mc" ? (
        <MaterialCommunityIcons name={icon.name} size={24} color={tint} />
      ) : (
        <Ionicons name={icon.name} size={24} color={tint} />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    zIndex:          9999,
    backgroundColor: "#FFFFFF",
    alignItems:      "center",
    justifyContent:  "center",
  },
  noTouch: {
    // RN 0.78+: pointerEvents lives on style. Older RN web bundles fall back
    // to the prop, but new-arch builds will print a deprecation otherwise.
    pointerEvents: "none",
  },
  content: {
    width:           "82%",
    maxWidth:        340,
    alignItems:      "center",
    paddingVertical: theme.spacing[4],
  },
  logoWrap: {
    width:           140,
    height:          140,
    marginTop:       theme.spacing[2],
    alignItems:      "center",
    justifyContent:  "center",
  },
  logo: {
    width:  "100%",
    height: "100%",
  },
  divider: {
    height:          1,
    backgroundColor: theme.colors.border.default,
    marginTop:       theme.spacing[3],
    marginBottom:    theme.spacing[3],
  },
  grid: {
    width:           "100%",
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    borderRadius:    theme.layout.cardRadius,
    backgroundColor: "rgba(255,255,255,0.6)",
    overflow:        "hidden",
  },
  gridRow: {
    flexDirection: "row",
  },
  gridCell: {
    flex:           1,
    aspectRatio:    1,
    alignItems:     "center",
    justifyContent: "center",
  },
  gridCellBorderEnd: {
    borderEndWidth: 1,
    borderEndColor: theme.colors.border.default,
  },
  gridCellBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.default,
  },
  progressTrack: {
    width:           120,
    height:          3,
    borderRadius:    2,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginTop:       theme.spacing[3],
    overflow:        "hidden",
  },
  progressFill: {
    width:           "100%",
    height:          "100%",
    backgroundColor: theme.colors.brand.base,
    borderRadius:    2,
    transformOrigin: "left center",
  },
});
