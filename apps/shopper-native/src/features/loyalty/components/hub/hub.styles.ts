/**
 * Shared StyleSheet tokens for the Loyalty Hub component family.
 * Each component imports only the slice it needs.
 */
import { StyleSheet } from "react-native";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

// ─── Screen shell ─────────────────────────────────────────────────────────────
export const screenStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
});

// ─── Section wrapper + header ─────────────────────────────────────────────────
export const sectionStyles = StyleSheet.create({
  wrap: { marginTop: 16 },
  header: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: theme.spacing[4],
    marginBottom:      10,
  },
  titleRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           7,
  },
  iconDot: {
    width:          26,
    height:         26,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
  },
  title: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.text.primary,
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: -0.2,
  },
  cta: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand.base,
  },
});

// ─── Hero / LoyaltyPointsCard ─────────────────────────────────────────────────
export const heroStyles = StyleSheet.create({
  gradient: {
    paddingHorizontal: 20,
    paddingTop:        22,
    paddingBottom:     24,
    gap:               14,
    marginHorizontal:  theme.spacing[4],
    borderRadius:      24,
    overflow:          "hidden",
    marginBottom:      4,
    ...theme.shadow.lg,
  },
  topRow: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  greeting: { gap: 1 },
  welcome: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      "rgba(255,255,255,0.55)",
    textAlign:  textAlignStart(isRtl()),
  },
  name: {
    fontFamily:    theme.fonts.black,
    fontSize:      20,
    color:         "#fff",
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: -0.3,
    maxWidth:      200,
  },
  avatarRing: {
    width:          52,
    height:         52,
    borderRadius:   26,
    borderWidth:    2,
    alignItems:     "center",
    justifyContent: "center",
  },
  avatarInner: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
  },
  badgeRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           8,
  },
  tierBadge: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      20,
    borderWidth:       1,
  },
  tierBadgeLabel: {
    fontFamily:    theme.fonts.black,
    fontSize:      11,
    letterSpacing: 0.2,
  },
  multiplierBadge: {
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      10,
    backgroundColor:   "rgba(255,255,255,0.14)",
  },
  multiplierText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.80)",
  },
  balanceBlock: { alignItems: "center", gap: 3 },
  balanceEyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      10,
    color:         "rgba(255,255,255,0.50)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  balanceRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "baseline",
    gap:           8,
  },
  balanceValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      52,
    color:         "#fff",
    letterSpacing: -2,
    writingDirection: "ltr",
    fontVariant:   ["tabular-nums"],
    // TextInput reset
    padding:       0,
    margin:        0,
    borderWidth:   0,
    backgroundColor: "transparent",
  },
  balanceUnit: {
    fontFamily: theme.fonts.bold,
    fontSize:   20,
    color:      "rgba(255,255,255,0.75)",
  },
  statsRow: {
    flexDirection:     flexRow(isRtl()),
    backgroundColor:   "rgba(255,255,255,0.09)",
    borderRadius:      16,
    paddingVertical:   12,
    paddingHorizontal: 8,
  },
  statPill:        { flex: 1, alignItems: "center", gap: 2 },
  statValue:       { fontFamily: theme.fonts.black, fontSize: 16, color: "rgba(255,255,255,0.82)", writingDirection: "ltr", fontVariant: ["tabular-nums"] },
  statValueHL:     { color: "#fff", fontSize: 17 },
  statLabel:       { fontFamily: theme.fonts.regular, fontSize: 10, color: "rgba(255,255,255,0.45)" },
  statsDiv: {
    width:           1,
    height:          32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf:       "center",
  },
  progressWrap: { gap: 7 },
  progressMeta: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.65)",
    flex:       1,
    textAlign:  textAlignStart(isRtl()),
  },
  progressPct: { fontFamily: theme.fonts.black, fontSize: 12, color: "#fff", marginStart: 8, writingDirection: "ltr", fontVariant: ["tabular-nums"] },
  progressTrack: {
    height:          6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius:    3,
    overflow:        "hidden",
  },
  progressFill: {
    height:          6,
    backgroundColor: theme.colors.amber[500],
    borderRadius:    3,
  },
});

// ─── Tier journey ─────────────────────────────────────────────────────────────
export const tierStyles = StyleSheet.create({
  rail:        { marginHorizontal: -2 },
  railContent: { paddingHorizontal: theme.spacing[4], paddingVertical: 8, alignItems: "center", gap: 0 },
  nodeWrap:    { alignItems: "center", width: 96, gap: 7 },
  nodeRing: {
    width:          62,
    height:         62,
    borderRadius:   31,
    borderWidth:    2,
    borderColor:    theme.colors.border.default,
    alignItems:     "center",
    justifyContent: "center",
    ...theme.shadow.card,
  },
  nodeRingDim:  { borderColor: theme.colors.border.hairline },
  nodeIcon: {
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     "center",
    justifyContent: "center",
  },
  connector:     { width: 40, height: 3, backgroundColor: theme.colors.border.default, borderRadius: 999, marginBottom: 32 },
  connectorDone: { backgroundColor: theme.colors.brand[400] },
  nodeName:        { fontFamily: theme.fonts.bold,  fontSize: 12, color: theme.colors.text.disabled, textAlign: "center" },
  nodeNameCurrent: { fontFamily: theme.fonts.black },
  currentChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  currentChipText: { fontFamily: theme.fonts.black, fontSize: 9, letterSpacing: 0.2 },
  nextChip:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: theme.colors.subtle },
  nextChipText: { fontFamily: theme.fonts.bold, fontSize: 9, color: theme.colors.text.tertiary },
  nodePts:      { fontFamily: theme.fonts.regular, fontSize: 11, color: theme.colors.text.disabled, textAlign: "center", writingDirection: "ltr", fontVariant: ["tabular-nums"], lineHeight: 16 },
});

// ─── Campaigns banner ─────────────────────────────────────────────────────────
export const campaignStyles = StyleSheet.create({
  listContent:    { paddingHorizontal: theme.spacing[4], gap: 10, paddingBottom: 4 },
  card: {
    width:        200,
    borderRadius: 18,
    padding:      16,
    gap:          6,
    ...theme.shadow.md,
  },
  skeletonCard: {
    width:           200,
    height:          140,
    borderRadius:    18,
    backgroundColor: theme.colors.surfaceSunken,
  },
  multiplierRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "baseline",
    gap:               3,
    alignSelf:         "flex-end",
    backgroundColor:   "rgba(255,255,255,0.20)",
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      10,
  },
  multiplierNum:  { fontFamily: theme.fonts.black,  fontSize: 18, color: "#fff" },
  multiplierUnit: { fontFamily: theme.fonts.bold,   fontSize: 11, color: "rgba(255,255,255,0.75)" },
  name:   { fontFamily: theme.fonts.black,   fontSize: 14, color: "#fff", textAlign: textAlignStart(isRtl()), letterSpacing: -0.2 },
  desc:   { fontFamily: theme.fonts.regular, fontSize: 11, color: "rgba(255,255,255,0.65)", textAlign: textAlignStart(isRtl()), lineHeight: 16 },
  minSpendRow: { flexDirection: flexRow(isRtl()), alignItems: "center", gap: 4 },
  minSpendText: { fontFamily: theme.fonts.bold, fontSize: 10, color: "rgba(255,255,255,0.65)" },
  expiryRow: { flexDirection: flexRow(isRtl()), alignItems: "center", gap: 4, alignSelf: "flex-end", marginTop: 4 },
  expiryText:        { fontFamily: theme.fonts.bold, fontSize: 10, color: "rgba(255,255,255,0.55)" },
  expiryTextUrgent:  { color: theme.colors.amber[100] },
});

// ─── Quick destinations ───────────────────────────────────────────────────────
export const destStyles = StyleSheet.create({
  grid:     { paddingHorizontal: theme.spacing[4], gap: 8 },
  card: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.card,
  },
  iconGrad: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1, gap: 2 },
  label:    { fontFamily: theme.fonts.black,   fontSize: 14, color: theme.colors.text.primary,   textAlign: textAlignStart(isRtl()), letterSpacing: -0.2 },
  sub:      { fontFamily: theme.fonts.regular, fontSize: 12, color: theme.colors.text.tertiary,  textAlign: textAlignStart(isRtl()) },
});

// ─── Recent activity ──────────────────────────────────────────────────────────
export const activityStyles = StyleSheet.create({
  list:     { paddingHorizontal: theme.spacing[4], gap: 6 },
  row: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             10,
    backgroundColor: theme.colors.surface,
    borderRadius:    14,
    padding:         12,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.hairline,
  },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  meta:    { flex: 1, gap: 2 },
  source:  { fontFamily: theme.fonts.bold,    fontSize: 13, color: theme.colors.text.primary,   textAlign: textAlignStart(isRtl()) },
  date:    { fontFamily: theme.fonts.regular, fontSize: 11, color: theme.colors.text.tertiary,  textAlign: textAlignStart(isRtl()) },
  deltaWrap: { flexDirection: flexRow(isRtl()), alignItems: "baseline", gap: 2 },
  delta:   { fontFamily: theme.fonts.black, fontSize: 16, letterSpacing: -0.5 },
  unit:    { fontFamily: theme.fonts.bold,  fontSize: 11, color: theme.colors.text.tertiary },
  skeleton: { height: 56, borderRadius: 14, backgroundColor: theme.colors.surfaceSunken, marginBottom: 6 },
  empty:   { alignItems: "center", paddingVertical: 28, paddingHorizontal: 32, gap: 6 },
  emptyText: { fontFamily: theme.fonts.bold,    fontSize: 14, color: theme.colors.text.secondary, textAlign: "center" },
  emptySub:  { fontFamily: theme.fonts.regular, fontSize: 12, color: theme.colors.text.tertiary,  textAlign: "center" },
  inlineError: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    justifyContent:  "space-between",
    marginHorizontal: theme.spacing[4],
    padding:         12,
    borderRadius:    12,
    backgroundColor: theme.colors.surfaceSunken,
  },
  inlineErrorText: { fontFamily: theme.fonts.bold, fontSize: 13, color: theme.colors.text.secondary },
  retryBtn: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               4,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    backgroundColor:   theme.colors.surface,
  },
  retryText: { fontFamily: theme.fonts.bold, fontSize: 12, color: theme.colors.brand.base },
});

// ─── Ways to earn ─────────────────────────────────────────────────────────────
export const earnStyles = StyleSheet.create({
  list: { paddingHorizontal: theme.spacing[4], gap: 8 },
  card: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.hairline,
  },
  cardTappable: { borderColor: theme.colors.border.default },
  iconBox: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  textWrap: { flex: 1, gap: 3 },
  title:    { fontFamily: theme.fonts.black,   fontSize: 14, color: theme.colors.text.primary,   textAlign: textAlignStart(isRtl()), letterSpacing: -0.2 },
  body:     { fontFamily: theme.fonts.regular, fontSize: 12, color: theme.colors.text.secondary, textAlign: textAlignStart(isRtl()), lineHeight: 18 },
  ctaChip: { flexDirection: flexRow(isRtl()), alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, borderWidth: 1, flexShrink: 0 },
  ctaText:  { fontFamily: theme.fonts.black, fontSize: 11 },
});

// ─── Full-screen panels (unauth / error / skeleton) ───────────────────────────
export const panelStyles = StyleSheet.create({
  panel: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
  iconBox: {
    width:           72,
    height:          72,
    borderRadius:    22,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    4,
  },
  title: { fontFamily: theme.fonts.black,   fontSize: 17, color: theme.colors.text.primary,   textAlign: "center", letterSpacing: -0.3 },
  body:  { fontFamily: theme.fonts.regular, fontSize: 14, color: theme.colors.text.secondary, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  retryBtn: { marginTop: 12, borderRadius: 14, overflow: "hidden" },
  retryGrad: { flexDirection: flexRow(isRtl()), alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  retryText: { fontFamily: theme.fonts.black, fontSize: 14, color: "#fff" },
  skeletonHero: { height: 220, marginHorizontal: theme.spacing[4], borderRadius: 24, backgroundColor: theme.colors.surfaceSunken },
  skeletonRow:  { height: 56,  borderRadius: 14, backgroundColor: theme.colors.surfaceSunken },
  skeletonCard: { flex: 1, height: 80, borderRadius: 14, backgroundColor: theme.colors.surfaceSunken },
});
