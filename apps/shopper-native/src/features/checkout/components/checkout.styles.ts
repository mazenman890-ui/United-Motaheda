/**
 * Shared StyleSheet tokens for the checkout screen family.
 * Each component imports only the slices it needs — no global "styles" blob.
 */
import { StyleSheet } from "react-native";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

// ─── Header ──────────────────────────────────────────────────────────────────
export const headerStyles = StyleSheet.create({
  root: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: theme.spacing[4],
    paddingBottom:     14,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: theme.colors.subtle,
    alignItems:      "center",
    justifyContent:  "center",
  },
  badge: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      999,
    backgroundColor:   theme.colors.success.bg,
    borderWidth:       1,
    borderColor:       theme.colors.success.light,
  },
});

// ─── Step bar ─────────────────────────────────────────────────────────────────
export const stepBarStyles = StyleSheet.create({
  root: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: theme.spacing[4],
    paddingVertical:   14,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  pill: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               7,
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      999,
  },
  pillActive: {
    ...theme.shadow.brandGlow,
    shadowOpacity: 0.14,
  },
  num: {
    width:           20,
    height:          20,
    borderRadius:    10,
    alignItems:      "center",
    justifyContent:  "center",
  },
  numText:  { fontSize: 11, fontFamily: theme.fonts.black, color: "#fff" },
  label:    { fontSize: 12, fontFamily: theme.fonts.bold,  letterSpacing: 0.2 },
  line: {
    flex:            1,
    height:          2,
    backgroundColor: theme.colors.slate[200],
    borderRadius:    1,
  },
});

// ─── Section card ─────────────────────────────────────────────────────────────
export const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    marginBottom:    14,
    ...theme.shadow.card,
  },
  head: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingTop:        14,
    paddingBottom:     6,
  },
  titleWrap: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           10,
  },
  icon: {
    width:           30,
    height:          30,
    borderRadius:    10,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  actionWrap: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           2,
  },
  body: {
    paddingHorizontal: theme.spacing[4],
    paddingTop:        4,
    paddingBottom:     theme.spacing[4],
    gap:               10,
  },
});

// ─── CTA bar ─────────────────────────────────────────────────────────────────
export const ctaStyles = StyleSheet.create({
  root: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    backgroundColor:   theme.colors.surface,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    theme.colors.border.hairline,
    paddingHorizontal: theme.spacing[4],
    paddingTop:        14,
    gap:               12,
    shadowColor:       "#0C2240",
    shadowOffset:      { width: 0, height: -4 },
    shadowOpacity:     0.06,
    shadowRadius:      12,
    elevation:         8,
  },
  totals: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  countBadge: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      999,
  },
  btnInner: { flexDirection: flexRow(isRtl()), alignItems: "center", gap: 6 },
  btnText:  { fontSize: 15, fontFamily: theme.fonts.black, color: "#fff", letterSpacing: -0.2 },
  totalValue: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.6,
    marginTop:     2,
  },
});

// ─── Summary row ─────────────────────────────────────────────────────────────
export const summaryStyles = StyleSheet.create({
  row: {
    flexDirection:  flexRow(isRtl()),
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  divider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  10,
  },
  totalRow: {
    flexDirection:  flexRow(isRtl()),
    justifyContent: "space-between",
    alignItems:     "baseline",
  },
  totalLabel: {
    fontSize:      14,
    fontFamily:    theme.fonts.extrabold,
    color:         theme.colors.text.primary,
    letterSpacing: -0.2,
  },
  totalValue: {
    fontSize:      22,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.brand[700],
    letterSpacing: -0.5,
  },
  etaPill: {
    alignSelf:         "flex-end",
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    backgroundColor:   theme.colors.brand[50],
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
    marginTop:         6,
  },
  etaText: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.brand[700] },
});

// ─── Free-delivery banner ─────────────────────────────────────────────────────
export const freeBannerStyles = StyleSheet.create({
  root: {
    borderRadius:    16,
    padding:         14,
    gap:             10,
    marginBottom:    14,
    backgroundColor: theme.colors.amber[50],
    borderWidth:     1,
    borderColor:     "rgba(245,158,11,0.18)",
  },
  head: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           10,
  },
  iconBox: {
    width:           30,
    height:          30,
    borderRadius:    10,
    backgroundColor: theme.colors.amber[100],
    alignItems:      "center",
    justifyContent:  "center",
  },
  title: {
    color:      theme.colors.amber[900],
    fontFamily: theme.fonts.semibold,
    marginTop:  2,
  },
  barTrack: {
    height:          4,
    borderRadius:    2,
    backgroundColor: "rgba(245,158,11,0.18)",
    overflow:        "hidden",
  },
  barFill: {
    height:          "100%",
    backgroundColor: theme.colors.amber[500],
    borderRadius:    2,
  },
});

// ─── Error box ───────────────────────────────────────────────────────────────
export const errorStyles = StyleSheet.create({
  box: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "flex-start",
    gap:               8,
    padding:           12,
    borderRadius:      14,
    backgroundColor:   theme.colors.red[50],
    borderWidth:       1,
    borderColor:       theme.colors.red[100],
  },
  text: {
    flex:       1,
    fontSize:   11,
    fontFamily: theme.fonts.semibold,
    color:      theme.colors.red[700],
    textAlign:  textAlignStart(isRtl()),
    lineHeight: 18,
  },
});
