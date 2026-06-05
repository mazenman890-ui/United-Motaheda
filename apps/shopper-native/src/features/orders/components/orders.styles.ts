/**
 * Shared styles + palette constants for the Orders screen family.
 *
 * Intentional non-token values (documented):
 *   AUTH_TEAL   — semi-transparent teal on the dark auth hero gradient
 *   AUTH_GLASS  — white glass on the dark auth hero gradient
 *   ORDER_DARK  — dark slate overlays for card borders / dividers
 *   HERO_GRAD   — hero gradient (navy palette)
 *   EMPTY_GRAD  — illustration background gradient (teal-tinted)
 *   INDIGO_GRAD — active-orders stat gradient (no theme token)
 *   EMERALD_GRAD— delivered-orders stat gradient (no theme token)
 */
import { StyleSheet } from "react-native";
import { theme } from "@/shared/theme";

// ─── Palette constants ────────────────────────────────────────────────────────

export const AUTH_TEAL = {
  r05:  "rgba(13,184,168,0.05)",
  r10:  "rgba(13,184,168,0.10)",
  r18:  "rgba(13,184,168,0.18)",
  r25:  "rgba(13,184,168,0.25)",
  r30:  "rgba(13,184,168,0.30)",
  r35:  "rgba(13,184,168,0.35)",
} as const;

export const AUTH_GLASS = {
  w10:  "rgba(255,255,255,0.10)",
  w55:  "rgba(255,255,255,0.55)",
} as const;

export const ORDER_DARK = {
  d05: "rgba(15,23,42,0.05)",
  d07: "rgba(15,23,42,0.07)",
  d10: "rgba(15,23,42,0.10)",
} as const;

export const HERO_GRAD: [string, string, string] = [
  theme.colors.hero, "#032840", "#053C5A",
];

// Illustration gradient — teal-tinted bg for the empty-state illustration
export const EMPTY_GRAD: [string, string] = ["#E6FDF9", "#D1FAF4"];

// Status dot / stat-card gradients without palette tokens
export const INDIGO_GRAD: [string, string] = ["#6366F1", "#4F46E5"];
export const EMERALD_GRAD: [string, string] = ["#10B981", "#059669"];
export const INDIGO_DOT  = "#6366F1";   // shipped status dot
export const EMERALD_DOT = "#10B981";   // delivered status dot / payment verified

// ─── StyleSheet ───────────────────────────────────────────────────────────────

// ── Unauthenticated hero
export const authS = StyleSheet.create({
  hero: {
    alignItems:        "center",
    paddingTop:        48,           // breathing room above icon tile + pulse ring
    paddingBottom:     48,           // was inline override in JSX — moved here
    // Kept at spacing.lg (16): was spacing[3]=24 which squeezed "تتبع طلبك".
    paddingHorizontal: theme.spacing.lg,
    gap:               theme.spacing[3],
    // overflow: "hidden" intentionally absent — it physically clipped the
    // animated pulse ring and the decorative tracking dots at the bottom.
  },
  pulseRing: {
    position:     "absolute",
    width:        160,
    height:       160,
    borderRadius: 80,
    borderWidth:  1.5,
    borderColor:  AUTH_TEAL.r35,
  },
  staticRing: {
    position:     "absolute",
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  1,
    borderColor:  AUTH_TEAL.r18,
  },
  glowOrb: {
    position:        "absolute",
    top:             -60,
    right:           -60,
    width:           180,
    height:          180,
    borderRadius:    90,
    backgroundColor: AUTH_TEAL.r10,
  },
  iconTile: {
    width:        88,
    height:       88,
    borderRadius: 26,
    overflow:     "hidden",
  },
  iconInner: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    26,
    backgroundColor: AUTH_GLASS.w10,
  },
  heroText: {
    alignItems: "center",
    gap:        theme.spacing.sm,
  },
  heroTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         theme.colors.surface,
    textAlign:     "center",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      AUTH_GLASS.w55,
    textAlign:  "center",
    lineHeight: 20,
    maxWidth:   280,
  },
  card: {
    margin:            theme.spacing.lg,
    backgroundColor:   theme.colors.surface,
    borderRadius:      24,
    paddingVertical:   theme.spacing[2.5],  // 20 — keep vertical rhythm
    paddingHorizontal: theme.spacing.lg,    // 16 — was 20; reduces per-side squeeze by 4px
    gap:               theme.spacing.lg,
    shadowColor:       theme.colors.hero,
    shadowOffset:      { width: 0, height: 8 },
    shadowOpacity:     0.10,
    shadowRadius:      20,
    elevation:         8,
  },
  signInBtn: {
    borderRadius: 16,
    overflow:     "hidden",
  },
  signInGrad: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             10,
    paddingVertical: 15,
    borderRadius:    16,
  },
  signInText: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.surface,
    letterSpacing: 0.2,
  },
  createBtn: {
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 13,
    borderRadius:    16,
    borderWidth:     1.5,
    borderColor:     AUTH_TEAL.r30,
    backgroundColor: AUTH_TEAL.r05,
  },
  createText: {
    fontFamily:    theme.fonts.bold,
    fontSize:      14,
    color:         theme.colors.brand[700],
    letterSpacing: 0.1,
  },
  divider: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  dividerLine: {
    flex:            1,
    height:          StyleSheet.hairlineWidth,
    backgroundColor: ORDER_DARK.d10,
  },
  dividerText: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.slate[400],
  },
  feature: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  featureIcon: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: AUTH_TEAL.r10,
    alignItems:      "center",
    justifyContent:  "center",
  },
  featureLabel: {
    flex:       1,
    fontFamily: theme.fonts.semibold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    textAlign:  "right",
  },
  privacyRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            5,
    paddingTop:     theme.spacing.xs,
  },
  privacyText: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.slate[400],
  },
});

// ── Empty state (authenticated, no orders)
export const emptyS = StyleSheet.create({
  container: {
    alignItems:        "center",
    paddingTop:        36,
    paddingHorizontal: theme.spacing[3],
    gap:               theme.spacing[3],
  },
  illusWrap: { marginBottom: theme.spacing.xs },
  illusBg: {
    width:          160,
    height:         160,
    borderRadius:   80,
    alignItems:     "center",
    justifyContent: "center",
  },
  illusRing: {
    width:          130,
    height:         130,
    borderRadius:   65,
    borderWidth:    1.5,
    borderColor:    AUTH_TEAL.r25,
    alignItems:     "center",
    justifyContent: "center",
  },
  illusBadge: {
    position:        "absolute",
    bottom:          16,
    right:           16,
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: theme.colors.teal[500],
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     2,
    borderColor:     theme.colors.surface,
  },
  textBlock: {
    alignItems: "center",
    gap:        theme.spacing.sm,
  },
  headline: { letterSpacing: -0.4 },
  sub: {
    lineHeight: 20,
    maxWidth:   280,
    textAlign:  "center",
  },
  ctaWrap: {
    borderRadius: 999,   // pill — highly clickable per spec
    overflow:     "hidden",
    width:        240,
  },
  ctaGrad: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               theme.spacing.sm,
    paddingVertical:   16,
    paddingHorizontal: theme.spacing[3.5],
    borderRadius:      999,
  },
  ctaText: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
    color:      theme.colors.surface,
  },
  catsSection: {
    width:      "100%",
    alignItems: "center",
    marginTop:  theme.spacing.sm,
  },
  catRow: {
    flexDirection:  "row-reverse",
    gap:            10,
    flexWrap:       "wrap",
    justifyContent: "center",
  },
  catChip: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               7,
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderRadius:      14,
  },
  catLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
  },
});

// ── Orders list
export const listS = StyleSheet.create({
  listContent: {
    padding: theme.spacing.lg,
    gap:     theme.spacing.md,
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap:           10,
    marginBottom:  theme.spacing.xs,
  },
  statCard: {
    flex:            1,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         theme.spacing.md,
    gap:             theme.spacing.sm,
    alignItems:      "center",
    shadowColor:     theme.colors.hero,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       3,
  },
  statIcon: {
    width:          34,
    height:         34,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  statValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      20,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      theme.colors.text.tertiary,
    textAlign:  "center",
    lineHeight: 13,
  },
  card: {
    backgroundColor:   theme.colors.surface,  // pure white
    borderRadius:      20,
    paddingHorizontal: theme.layout.pagePaddingH,  // 20 — standard page content width
    paddingVertical:   18,
    gap:               14,                     // massive clean whitespace
    // Soft shadow — elevation 2, premium feel without visual noise
    shadowColor:       theme.colors.hero,
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.05,
    shadowRadius:      10,
    elevation:         2,
    // No border — pure white card speaks for itself on off-white bg
  },
  // statusLine kept for backward-compat but no longer rendered in new OrderCard
  statusLine: {
    height: 0,  // effectively removed — TrackingTimeline replaces this
  },
  cardHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      6,
  },
  headerLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
  },
  orderIcon: {
    width:          36,
    height:         36,
    borderRadius:   12,
    borderWidth:    1,
    alignItems:     "center",
    justifyContent: "center",
  },
  orderRef: {
    fontFamily:    theme.fonts.black,
    fontSize:      13.5,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  orderDate: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
    marginTop:  1,
  },
  badgeGroup: {
    alignItems: "center",
    gap:        6,
  },
  pmDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  itemsRow: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             theme.spacing.md,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    14,
    padding:         theme.spacing.md,
  },
  itemThumb: {
    width:           56,
    height:          56,
    borderRadius:    14,
    overflow:        "hidden",
    backgroundColor: theme.colors.surface,
  },
  itemPlaceholder: {
    backgroundColor: theme.colors.slate[100],
    alignItems:      "center",
    justifyContent:  "center",
  },
  cardFooter: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingTop:     10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ORDER_DARK.d07,
  },
  totalText: {
    fontFamily:    theme.fonts.black,
    fontSize:      17,
    color:         theme.colors.brand[700],
    letterSpacing: -0.4,
    textAlign:     "right",
  },
  skeletonRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
    marginTop:     theme.spacing.xs,
  },
  skeletonItems: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             theme.spacing.md,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    14,
    padding:         theme.spacing.md,
  },
  skeletonFooter: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingTop:     10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ORDER_DARK.d07,
  },
  skeletonRect: {
    backgroundColor: theme.colors.slate[100],
    borderRadius:    6,
  },
  skeletonContainer: {
    gap:     theme.spacing.md,
    padding: theme.spacing.lg,
  },
});
