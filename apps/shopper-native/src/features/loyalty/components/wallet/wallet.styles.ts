/**
 * Shared StyleSheet tokens for the Loyalty Wallet component family.
 * All spacing uses theme.spacing tokens; all colours use theme.colors.
 *
 * Intentional exceptions (documented inline):
 *   HERO_GRADIENT  — brand navy palette without exact tokens
 *   OVERLAY_*      — semi-transparent white/black on dark gradient backgrounds
 */
import { StyleSheet, TextInput } from "react-native";
import Animated from "react-native-reanimated";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

// ─── Gradient / overlay constants ─────────────────────────────────────────────
/** Deep navy gradient for hero cards and tour modal. */
export const HERO_GRADIENT: [string, string, string] = [
  theme.colors.hero,  // deep navy anchor
  "#2d5a8e",          // brand-blue mid (no token — intentional palette)
  "#1a4a75",          // lighter blue  (no token — intentional palette)
];
export const TOUR_GRADIENT: [string, string] = ["#2d5a8e", theme.colors.hero];

// Semi-transparent overlays on dark hero backgrounds — no theme token exists;
// these are intentional glass-surface values per the design system.
export const OVERLAY = {
  white55:  "rgba(255,255,255,0.55)",
  white70:  "rgba(255,255,255,0.70)",
  white80:  "rgba(255,255,255,0.80)",
  white85:  "rgba(255,255,255,0.85)",
  white08:  "rgba(255,255,255,0.08)",
  white15:  "rgba(255,255,255,0.15)",
  white18:  "rgba(255,255,255,0.18)",
  white20:  "rgba(255,255,255,0.20)",
  darkScrim:"rgba(0,0,0,0.60)",
} as const;

// ─── AnimatedTextInput for UI-thread counter ──────────────────────────────────
export const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// ─── Balance hero card ────────────────────────────────────────────────────────
export const heroStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,  // 16
    paddingBottom:     theme.spacing.xs,  // 4
  },
  card: {
    borderRadius: 24,
    padding:      theme.spacing[2.5],    // 20
    gap:          14,
    overflow:     "hidden",
  },
  topRow: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  tierBadge: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      20,
    borderWidth:       1,
  },
  tierBadgeText: {
    fontFamily:    theme.fonts.black,
    fontSize:      11,
    letterSpacing: 0.3,
  },
  multiplierBadge: {
    paddingHorizontal: theme.spacing.xs,   // 4 → 8 closest above
    paddingVertical:   theme.spacing.xs,   // 4
    borderRadius:      10,
    backgroundColor:   OVERLAY.white15,
  },
  multiplierText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      OVERLAY.white85,
  },
  balanceCenter: {
    alignItems: "center",
    gap:        theme.spacing.xs,  // 4
  },
  balanceEyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      11,
    color:         OVERLAY.white55,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  balanceRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "baseline",
    gap:           theme.spacing.sm,  // 8
  },
  balanceValue: {
    fontFamily:      theme.fonts.black,
    fontSize:        48,
    color:           "#fff",
    letterSpacing:   -2,
    // TextInput reset
    padding:         0,
    borderWidth:     0,
    backgroundColor: "transparent",
  },
  balanceUnit: {
    fontFamily: theme.fonts.bold,
    fontSize:   18,
    color:      OVERLAY.white80,
  },
  statsRow: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    backgroundColor: OVERLAY.white08,
    borderRadius:    16,
    padding:         theme.spacing.md,   // 12
  },
  statChip: {
    flex:       1,
    gap:        3,
    alignItems: "center",
  },
  statChipValue: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
    color:      "#fff",
  },
  statChipLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      OVERLAY.white55,
  },
  statsSep: {
    width:            1,
    height:           32,
    backgroundColor:  OVERLAY.white18,
    marginHorizontal: theme.spacing.sm,  // 8
  },
  progressSection: {
    gap: theme.spacing.sm,  // 8
  },
  progressLabelRow: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      OVERLAY.white70,
    flex:       1,
    textAlign:  textAlignStart(isRtl()),
  },
  progressPct: {
    fontFamily:  theme.fonts.black,
    fontSize:    12,
    color:       "#fff",
    marginStart: theme.spacing.sm,  // 8
  },
  progressTrack: {
    height:          6,
    backgroundColor: OVERLAY.white20,
    borderRadius:    3,
    overflow:        "hidden",
  },
  progressFill: {
    height:          6,
    backgroundColor: theme.colors.amber[500],
    borderRadius:    3,
  },
});

// ─── Quick actions ─────────────────────────────────────────────────────────────
export const quickStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,   // 16
    paddingVertical:   10,
    gap:               theme.spacing.sm,   // 8
  },
  row: {
    flexDirection: flexRow(isRtl()),
    gap:           theme.spacing.sm,       // 8
  },
  tileOuter: { flex: 1 },
  tile: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    paddingVertical: theme.spacing.md,     // 12
    alignItems:      "center",
    gap:             6,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    ...theme.shadow.hairline,
  },
  tileDisabled: {
    backgroundColor: theme.colors.subtle,
    borderColor:     theme.colors.border.hairline,
  },
  iconWrap: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      theme.colors.text.primary,
    textAlign:  "center",
  },
});

// ─── Section header ────────────────────────────────────────────────────────────
export const sectionHeaderStyles = StyleSheet.create({
  row: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: theme.spacing.lg,   // 16
    paddingTop:        theme.spacing.md,   // 12
    paddingBottom:     theme.spacing.sm,   // 8
  },
  titleWrap: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           6,
  },
  title: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.text.primary,
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: -0.2,
  },
  seeAll: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand[600],
  },
});

// ─── Card lists ────────────────────────────────────────────────────────────────
export const cardStyles = StyleSheet.create({
  list: {
    paddingHorizontal: theme.spacing.lg,  // 16
    gap:               theme.spacing.sm,  // 8
  },
  couponCard: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             10,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    paddingVertical: 14,
    paddingEnd:      14,
    paddingStart:    0,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    overflow:        "hidden",
    ...theme.shadow.card,
  },
  couponAccent: {
    width:                    4,
    alignSelf:                "stretch",
    backgroundColor:          theme.colors.brand[500],
    borderTopRightRadius:     16,
    borderBottomRightRadius:  16,
    marginEnd:                10,
  },
  couponCode: {
    fontFamily:    theme.fonts.black,
    fontSize:      17,
    color:         theme.colors.text.primary,
    letterSpacing: 1.2,
    textAlign:     textAlignStart(isRtl()),
  },
  couponExpiry: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  textAlignStart(isRtl()),
    marginTop:  theme.spacing.xs,  // 4
  },
  activeBadge: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               3,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      8,
    backgroundColor:   theme.colors.brand[600],
  },
  activeBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize:   9,
    color:      "#fff",
  },
  copyBtn: {
    width:           34,
    height:          34,
    borderRadius:    10,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     theme.colors.brand[200],
  },
  copyBtnDone: {
    backgroundColor: theme.colors.brand[600],
    borderColor:     theme.colors.brand[600],
  },
  showMoreBtn: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    justifyContent:  "center",
    gap:             6,
    paddingVertical: theme.spacing.md,   // 12
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     theme.colors.brand[200],
    borderStyle:     "dashed",
    backgroundColor: theme.colors.brand[50],
  },
  showMoreText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand[700],
  },
  redemptionCard: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             theme.spacing.md,   // 12
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    ...theme.shadow.card,
  },
  redemptionIcon: {
    width:           42,
    height:          42,
    borderRadius:    12,
    backgroundColor: theme.colors.amber[50],
    alignItems:      "center",
    justifyContent:  "center",
  },
  redemptionIconDone: { backgroundColor: theme.colors.brand[50] },
  redemptionPts: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.text.primary,
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: -0.2,
  },
  redemptionState: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.tertiary,
    textAlign:  textAlignStart(isRtl()),
    marginTop:  theme.spacing.xs,  // 4
  },
  stateChip: {
    paddingHorizontal: 9,
    paddingVertical:   theme.spacing.xs,  // 4
    borderRadius:      8,
  },
  stateChipPending: {
    backgroundColor: theme.colors.amber[50],
    borderWidth:     1,
    borderColor:     theme.colors.amber[200],
  },
  stateChipDone: {
    backgroundColor: theme.colors.brand[50],
    borderWidth:     1,
    borderColor:     theme.colors.brand[200],
  },
  stateChipText:        { fontFamily: theme.fonts.bold, fontSize: 11 },
  stateChipTextPending: { color: theme.colors.amber[700] },
  stateChipTextDone:    { color: theme.colors.brand[700] },
});

// ─── Empty / error atoms ───────────────────────────────────────────────────────
export const feedbackStyles = StyleSheet.create({
  frozenBanner: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               theme.spacing.sm,   // 8
    marginHorizontal:  theme.spacing.lg,   // 16
    marginBottom:      theme.spacing.xs,   // 4
    paddingVertical:   10,
    paddingHorizontal: 14,
    borderRadius:      14,
    backgroundColor:   theme.colors.rose[50],
    borderWidth:       1,
    borderColor:       theme.colors.rose[100],
  },
  frozenText: {
    flex:       1,
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.rose[700],
    textAlign:  textAlignStart(isRtl()),
    lineHeight: 17,
  },
  emptyRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               10,
    marginHorizontal:  theme.spacing.lg,   // 16
    paddingVertical:   14,
    paddingHorizontal: theme.spacing.lg,   // 16
    borderRadius:      14,
    backgroundColor:   theme.colors.surfaceSunken,
    marginBottom:      theme.spacing.xs,   // 4
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      theme.colors.text.secondary,
    flex:       1,
    textAlign:  textAlignStart(isRtl()),
  },
  emptyCard: {
    marginHorizontal: theme.spacing.lg,    // 16
    backgroundColor:  theme.colors.surfaceSunken,
    borderRadius:     18,
    padding:          theme.spacing[2.5],  // 20
    alignItems:       "center",
    gap:              theme.spacing.sm,    // 8
    marginBottom:     theme.spacing.xs,    // 4
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
  },
  emptyCardIcon: {
    width:           60,
    height:          60,
    borderRadius:    18,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    theme.spacing.xs,     // 4
  },
  emptyCardTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.2,
  },
  emptyCardBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 18,
    maxWidth:   280,
  },
  emptyCardCta: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 14,
    paddingVertical:   theme.spacing.sm,   // 8
    borderRadius:      10,
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.brand[200],
    marginTop:         theme.spacing.xs,   // 4
  },
  emptyCardCtaText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand[700],
  },
  errorRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "space-between",
    marginHorizontal:  theme.spacing.lg,   // 16
    paddingVertical:   theme.spacing.md,   // 12
    paddingHorizontal: 14,
    borderRadius:      14,
    backgroundColor:   theme.colors.surfaceSunken,
    marginBottom:      theme.spacing.xs,   // 4
  },
  errorRowText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.text.secondary,
    textAlign:  textAlignStart(isRtl()),
  },
  retryBtn: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: theme.spacing.md,   // 12
    paddingVertical:   6,
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    backgroundColor:   theme.colors.surface,
  },
  retryText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.brand[700],
  },
});

// ─── Skeleton ──────────────────────────────────────────────────────────────────
export const skeletonStyles = StyleSheet.create({
  hero:    { height: 200, borderRadius: 24, backgroundColor: theme.colors.surfaceSunken },
  actions: { flexDirection: flexRow(isRtl()), gap: theme.spacing.sm },
  tile:    { flex: 1, height: 78, borderRadius: 16, backgroundColor: theme.colors.surfaceSunken },
  row: {
    height:           60,
    borderRadius:     16,
    backgroundColor:  theme.colors.surfaceSunken,
    marginHorizontal: theme.spacing.lg,    // 16
    marginBottom:     theme.spacing.xs,    // 4
  },
});

// ─── Full-screen panels ────────────────────────────────────────────────────────
export const fullPanelStyles = StyleSheet.create({
  panel: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: theme.spacing[4],   // 32
    gap:               theme.spacing.md,   // 12
  },
  title: {
    fontFamily:    theme.fonts.black,
    fontSize:      17,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: theme.fonts.regular,
    fontSize:   14,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 22,
  },
  btn:     { marginTop: theme.spacing.sm, borderRadius: 14, overflow: "hidden" },
  btnGrad: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               theme.spacing.sm,   // 8
    paddingHorizontal: theme.spacing[3],   // 24
    paddingVertical:   13,
  },
  btnText: { fontFamily: theme.fonts.black, fontSize: 14, color: "#fff" },
});

// ─── Tour modal ────────────────────────────────────────────────────────────────
export const tourStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: OVERLAY.darkScrim,
    alignItems:      "center",
    justifyContent:  "center",
    padding:         theme.spacing[3],    // 24
  },
  card: {
    width:           "100%",
    maxWidth:        380,
    backgroundColor: theme.colors.surface,
    borderRadius:    28,
    padding:         theme.spacing[3.5],  // 28
    alignItems:      "center",
    gap:             theme.spacing.md,    // 12
    ...theme.shadow.lg,
  },
  iconWrap:  { borderRadius: 24, overflow: "hidden", marginBottom: theme.spacing.xs },
  iconGrad:  { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  title: {
    fontFamily:    theme.fonts.black,
    fontSize:      19,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: theme.fonts.regular,
    fontSize:   14,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 22,
    maxWidth:   300,
  },
  dots:    { flexDirection: "row", gap: 6, marginTop: theme.spacing.xs },
  dot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.border.default },
  dotActive: { width: 20, backgroundColor: theme.colors.brand[600] },
  actions: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           10,
    width:         "100%",
    marginTop:     theme.spacing.sm,   // 8
  },
  skipBtn: {
    paddingVertical:   theme.spacing.md,   // 12
    paddingHorizontal: 18,
    borderRadius:      14,
    backgroundColor:   theme.colors.subtle,
  },
  skipText: {
    fontFamily: theme.fonts.bold,
    fontSize:   14,
    color:      theme.colors.text.secondary,
  },
  nextBtn:    { flex: 1, borderRadius: 14, overflow: "hidden" },
  nextGrad: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "center",
    gap:            6,
    paddingVertical: 13,
  },
  nextText: { fontFamily: theme.fonts.black, fontSize: 14, color: "#fff" },
});
