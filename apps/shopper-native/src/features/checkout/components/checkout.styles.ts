import { StyleSheet } from "react-native";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";
import { kit } from "@/shared/kit";

// ─── Header ──────────────────────────────────────────────────────────────────
export const headerStyles = StyleSheet.create({
  root: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: theme.spacing[4],
    paddingBottom:     14,
    backgroundColor:   kit.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: kit.color.line,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: kit.color.well,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     kit.color.line,
  },
  badge: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      999,
    backgroundColor:   kit.color.successTint,
    borderWidth:       1,
    borderColor:       kit.color.line,
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
    backgroundColor:   kit.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: kit.color.line,
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
    ...kit.shadow.raised,
  },
  num: {
    width:           20,
    height:          20,
    borderRadius:    10,
    alignItems:      "center",
    justifyContent:  "center",
  },
  numText:  { fontSize: 11, fontFamily: theme.fonts.black, color: kit.color.onInk },
  label:    { fontSize: 12, fontFamily: theme.fonts.bold,  letterSpacing: 0.2 },
  line: {
    flex:            1,
    height:          2,
    backgroundColor: kit.color.lineStrong,
    borderRadius:    1,
  },
});

// ─── Section card ─────────────────────────────────────────────────────────────
export const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: kit.color.surface,
    borderRadius:    kit.radius.card,
    marginBottom:    14,
    borderWidth:     1,
    borderColor:     kit.color.line,
    ...kit.shadow.raised,
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
    backgroundColor: kit.color.accentTint,
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
    backgroundColor:   kit.color.surface,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    kit.color.line,
    paddingHorizontal: theme.spacing[4],
    paddingTop:        14,
    gap:               12,
    ...kit.shadow.floating,
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
    backgroundColor:   kit.color.accentTint,
    borderWidth:       1,
    borderColor:       kit.color.line,
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      999,
  },
  btnInner: { flexDirection: flexRow(isRtl()), alignItems: "center", gap: 6 },
  btnText:  { fontSize: 15, fontFamily: theme.fonts.black, color: kit.color.onInk, letterSpacing: -0.2 },
  totalValue: {
    color:         kit.color.ink,
    letterSpacing: -0.6,
    marginTop:     2,
  },
});

// ─── Summary row ─────────────────────────────────────────────────────────────
export const summaryStyles = StyleSheet.create({
  row: {
    flexDirection:   flexRow(isRtl()),
    justifyContent:  "space-between",
    paddingVertical: 5,
  },
  divider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: kit.color.line,
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
    color:         kit.color.ink,
    letterSpacing: -0.2,
  },
  totalValue: {
    fontSize:      22,
    fontFamily:    theme.fonts.black,
    color:         kit.color.ink,
    letterSpacing: -0.5,
  },
  etaPill: {
    alignSelf:         "flex-end",
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    backgroundColor:   kit.color.accentTint,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
    marginTop:         6,
  },
  etaText: { fontSize: 10, fontFamily: theme.fonts.bold, color: kit.color.accentDeep },
});

// ─── Free-delivery banner ─────────────────────────────────────────────────────
export const freeBannerStyles = StyleSheet.create({
  root: {
    borderRadius:    16,
    padding:         14,
    gap:             10,
    marginBottom:    14,
    backgroundColor: kit.color.warnTint,
    borderWidth:     1,
    borderColor:     kit.color.line,
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
    backgroundColor: kit.color.warnTint,
    alignItems:      "center",
    justifyContent:  "center",
  },
  title: {
    color:      kit.color.warn,
    fontFamily: theme.fonts.semibold,
    marginTop:  2,
  },
  barTrack: {
    height:          4,
    borderRadius:    2,
    backgroundColor: kit.color.lineStrong,
    overflow:        "hidden",
  },
  barFill: {
    height:          "100%",
    backgroundColor: kit.color.warn,
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
    backgroundColor:   kit.color.dangerTint,
    borderWidth:       1,
    borderColor:       kit.color.line,
  },
  text: {
    flex:       1,
    fontSize:   11,
    fontFamily: theme.fonts.semibold,
    color:      kit.color.danger,
    textAlign:  textAlignStart(isRtl()),
    lineHeight: 18,
  },
});
