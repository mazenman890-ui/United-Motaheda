/**
 * Cart screen styles + palette constants.
 *
 * Intentional non-token values (documented):
 *   TEAL_GLASS   — semi-transparent teal overlays on the dark hero header
 *   DARK_OVERLAY — dark slate overlays for dividers, borders, handles
 *   FREE_GREEN   — emerald free-delivery accent (no theme token)
 *   TRUST_PURPLE — trust-badge violet gradient (no theme token)
 *   SHADOW_NAV   — shadow color for cards/footer (#0C2240, near-navy)
 */
import { StyleSheet } from "react-native";
import { theme } from "@/shared/theme";

// ─── Palette constants ────────────────────────────────────────────────────────

export const CART_HEADER_GRADIENT: [string, string, string] = [
  theme.colors.hero,
  "#032840",  // slightly lighter than hero — intentional header palette
  "#053C5A",  // mid-blue for depth — intentional header palette
];

// Semi-transparent teal on the dark hero header — no theme token
export const TEAL_GLASS = {
  orb:      "rgba(13,184,168,0.12)",
  iconBg15: "rgba(13,184,168,0.15)",
  iconBg10: "rgba(13,184,168,0.10)",
  border30: "rgba(13,184,168,0.30)",
  border20: "rgba(13,184,168,0.20)",
  border14: "rgba(13,184,168,0.14)",
  badge18:  "rgba(13,184,168,0.18)",
  badge35:  "rgba(13,184,168,0.35)",
} as const;

// Semi-transparent dark overlays for dividers, borders, handles
export const DARK_OVERLAY = {
  d05: "rgba(15,23,42,0.05)",
  d07: "rgba(15,23,42,0.07)",
  d08: "rgba(15,23,42,0.08)",
} as const;

// Error glass on dark header background
export const ERROR_GLASS = {
  bg:     "rgba(239,68,68,0.12)",
  border: "rgba(239,68,68,0.25)",
} as const;

// Amber glass borders
export const AMBER_GLASS = {
  border22: "rgba(245,158,11,0.22)",
  border20: "rgba(245,158,11,0.20)",
} as const;

// Free-delivery emerald (no theme token)
export const FREE_GREEN = {
  deep:   "#059669",  // emerald-600
  bright: "#10B981",  // emerald-500
} as const;

// Trust-badge violet gradient (no theme token)
export const TRUST_PURPLE: [string, string] = ["#6D28D9", "#7C3AED"];

// Teal-200 for count badge text on dark bg (no theme token)
export const COUNT_TEXT_COLOR = "#5EEAD4";

// Header eyebrow white on dark (no theme token)
export const HEADER_WHITE45 = "rgba(255,255,255,0.45)";

// Shadow color for cards and footer — near-navy
export const SHADOW_NAV = "#0C2240";

// ─── StyleSheet ───────────────────────────────────────────────────────────────

export const s = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom:     18,
    overflow:          "hidden",
    backgroundColor:   theme.colors.hero,
  },
  headerGlowOrb: {
    position:        "absolute",
    top:             -50,
    right:           -50,
    width:           140,
    height:          140,
    borderRadius:    70,
    backgroundColor: TEAL_GLASS.orb,
  },
  headerRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  headerIcon: {
    width:           42,
    height:          42,
    borderRadius:    13,
    backgroundColor: TEAL_GLASS.iconBg15,
    borderWidth:     1,
    borderColor:     TEAL_GLASS.border30,
    alignItems:      "center",
    justifyContent:  "center",
  },
  headerEyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      10,
    color:         HEADER_WHITE45,
    textAlign:     "right",
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      22,
    color:         theme.colors.surface,
    textAlign:     "right",
    letterSpacing: -0.4,
    marginTop:     1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },
  countBadge: {
    backgroundColor: TEAL_GLASS.badge18,
    borderRadius:    20,
    paddingHorizontal: 11,
    paddingVertical:   6,
    borderWidth:     1,
    borderColor:     TEAL_GLASS.badge35,
  },
  countText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      COUNT_TEXT_COLOR,
  },
  clearBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   7,
    borderRadius:      10,
    backgroundColor:   ERROR_GLASS.bg,
    borderWidth:       1,
    borderColor:       ERROR_GLASS.border,
  },
  clearText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.error.base,
  },

  // ── List header components ─────────────────────────────────────────────────
  warnBanner: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               10,
    backgroundColor:   theme.colors.amber[50],
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   11,
    marginBottom:      theme.spacing.xs,
    borderWidth:       1,
    borderColor:       AMBER_GLASS.border22,
  },
  warnText: {
    flex:       1,
    fontFamily: theme.fonts.semibold,
    fontSize:   12,
    color:      theme.colors.amber[900],
    textAlign:  "right",
    lineHeight: 18,
  },
  branchPill: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing.md,
    backgroundColor:   theme.colors.surface,
    borderRadius:      16,
    paddingHorizontal: 14,
    paddingVertical:   theme.spacing.md,
    marginBottom:      theme.spacing.xs,
    shadowColor:       SHADOW_NAV,
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.06,
    shadowRadius:      8,
    elevation:         3,
    borderWidth:       1,
    borderColor:       TEAL_GLASS.border14,
  },
  branchIconBox: {
    width:           34,
    height:          34,
    borderRadius:    10,
    backgroundColor: TEAL_GLASS.iconBg10,
    borderWidth:     1,
    borderColor:     TEAL_GLASS.border20,
    alignItems:      "center",
    justifyContent:  "center",
  },
  branchEyebrow: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
  },
  branchName: {
    fontFamily:    theme.fonts.black,
    fontSize:      13,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    marginTop:     1,
  },
  deliveryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         theme.spacing.lg,
    marginBottom:    theme.spacing.xs,
    shadowColor:     SHADOW_NAV,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.05,
    shadowRadius:    8,
    elevation:       3,
  },
  freeRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           14,
  },
  freeIconBox: {
    width:          42,
    height:         42,
    borderRadius:   13,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  freeTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         FREE_GREEN.deep,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  freeSub: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      FREE_GREEN.bright,
    textAlign:  "right",
    marginTop:  2,
  },
  progressHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   10,
  },
  progressLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           7,
    flex:          1,
  },
  progressLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    textAlign:  "right",
    flex:       1,
  },
  progressPct: {
    fontFamily:  theme.fonts.black,
    fontSize:    13,
    color:       theme.colors.brand[700],
    marginLeft:  theme.spacing.sm,
  },
  track: {
    height:          7,
    backgroundColor: theme.colors.slate[100],
    borderRadius:    4,
    overflow:        "hidden",
  },
  fill: {
    height:          "100%",
    backgroundColor: theme.colors.teal[500],
    borderRadius:    4,
  },
  trustRow: {
    flexDirection:   "row-reverse",
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.xs,
    marginBottom:    theme.spacing.xs,
    shadowColor:     SHADOW_NAV,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.04,
    shadowRadius:    8,
    elevation:       2,
  },
  trustCell: {
    flex:             1,
    alignItems:       "center",
    gap:              6,
    paddingHorizontal: theme.spacing.xs,
  },
  trustDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: DARK_OVERLAY.d08,
  },
  trustIconBox: {
    width:          30,
    height:         30,
    borderRadius:   9,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  trustLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   9,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 13,
  },

  // ── Cart item card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor:  theme.colors.surface,
    borderRadius:     18,
    paddingHorizontal: 14,
    paddingTop:       theme.spacing.md,
    paddingBottom:    14,
    gap:              10,
    shadowColor:      SHADOW_NAV,
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.06,
    shadowRadius:     10,
    elevation:        4,
    borderWidth:      1,
    borderColor:      DARK_OVERLAY.d05,
  },
  cardTopRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  catLabel: {
    fontFamily:    theme.fonts.bold,
    fontSize:      9.5,
    color:         theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign:     "right",
  },
  deleteBtn: {
    width:           30,
    height:          30,
    borderRadius:    9,
    backgroundColor: theme.colors.error.bg,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
    alignItems:      "center",
    justifyContent:  "center",
  },
  cardMidRow: {
    flexDirection: "row-reverse",
    alignItems:    "flex-start",
    gap:           theme.spacing.md,
  },
  imgBox: {
    width:           72,
    height:          72,
    borderRadius:    14,
    overflow:        "hidden",
    backgroundColor: theme.colors.subtle,
    flexShrink:      0,
  },
  imgFallback: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: theme.colors.slate[50],
  },
  productName: {
    flex:          1,
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    lineHeight:    21,
    letterSpacing: -0.2,
  },
  cardBottomRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      2,
  },
  priceWrap: {
    flexDirection: "row-reverse",
    alignItems:    "baseline",
    gap:           theme.spacing.xs,
  },
  lineTotal: {
    fontFamily:    theme.fonts.black,
    fontSize:      18,
    color:         theme.colors.teal[600],
    letterSpacing: -0.4,
  },
  currency: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.teal[500],
  },
  unitHint: {
    fontFamily:  theme.fonts.regular,
    fontSize:    10,
    color:       theme.colors.text.tertiary,
    marginRight: theme.spacing.xs,
  },
  stepper: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    backgroundColor:   theme.colors.subtle,
    borderRadius:      12,
    paddingVertical:   6,
    paddingHorizontal: theme.spacing.sm,
    borderWidth:       1,
    borderColor:       DARK_OVERLAY.d07,
  },
  stepBtn: {
    width:        28,
    height:       28,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth:  1,
    borderColor:  TEAL_GLASS.border30,
    alignItems:   "center",
    justifyContent: "center",
    shadowColor:  theme.colors.brand[600],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation:    2,
  },
  stepBtnDisabled: {
    backgroundColor: theme.colors.slate[100],
    borderColor:     DARK_OVERLAY.d08,
    shadowOpacity:   0,
    elevation:       0,
  },
  qtyNum: {
    fontFamily:    theme.fonts.black,
    fontSize:      16,
    color:         theme.colors.text.primary,
    minWidth:      22,
    textAlign:     "center",
    letterSpacing: -0.3,
  },
  qtyNumMax: {
    color: theme.colors.amber[700],
  },
  maxHint: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing.xs,
    alignSelf:         "flex-start",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical:   3,
    backgroundColor:   theme.colors.amber[50],
    borderRadius:      6,
    borderWidth:       1,
    borderColor:       AMBER_GLASS.border20,
  },
  maxHintText: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      theme.colors.amber[700],
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor:   theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop:        theme.spacing.xs,
    shadowColor:       SHADOW_NAV,
    shadowOffset:      { width: 0, height: -6 },
    shadowOpacity:     0.08,
    shadowRadius:      16,
    elevation:         12,
  },
  footerHandle: {
    width:           40,
    height:          3,
    borderRadius:    2,
    backgroundColor: DARK_OVERLAY.d08,
    alignSelf:       "center",
    marginBottom:    14,
  },
  totalsBlock: {
    gap:          theme.spacing.sm,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   13.5,
    color:      theme.colors.text.secondary,
  },
  totalValue: {
    fontFamily: theme.fonts.semibold,
    fontSize:   13.5,
    color:      theme.colors.text.primary,
  },
  totalFree: {
    fontFamily: theme.fonts.black,
    fontSize:   13.5,
    color:      FREE_GREEN.deep,
  },
  totalDivider: {
    height:        StyleSheet.hairlineWidth,
    backgroundColor: DARK_OVERLAY.d08,
    marginVertical: 2,
  },
  grandRow: {
    flexDirection:  "row-reverse",
    alignItems:     "baseline",
    justifyContent: "space-between",
  },
  grandLabel: {
    fontFamily:    theme.fonts.black,
    fontSize:      18,
    color:         theme.colors.text.primary,
    letterSpacing: -0.3,
  },
  grandRight: {
    flexDirection: "row-reverse",
    alignItems:    "baseline",
    gap:           theme.spacing.xs,
  },
  grandValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         theme.colors.teal[600],
    letterSpacing: -0.8,
  },
  grandCurrency: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.teal[500],
  },
  checkoutOuter: {
    borderRadius: 18,
    overflow:     "hidden",
  },
  checkoutGrad: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             10,
    paddingVertical: theme.spacing.lg,
    borderRadius:    18,
  },
  checkoutText: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.surface,
    letterSpacing: 0.1,
  },
});
