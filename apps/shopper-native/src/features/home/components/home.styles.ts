/**
 * Shared StyleSheet tokens for the Home screen component family.
 * Each component imports only the slice it needs.
 */
import { StyleSheet } from "react-native";
import { theme } from "@/shared/theme";

// ─── Section containers ────────────────────────────────────────────────────────
export const sectionStyles = StyleSheet.create({
  /** Standard section vertical gap — 24px between major home sections. */
  wrap: {
    paddingTop: theme.spacing['2xl'],  // 24  (was 64 — spacing[8])
    gap:        theme.spacing[4],       // 32  — internal header/content gap
  },
  /** Slightly taller gap before the flash sale rail. */
  wrapTall: {
    paddingTop: theme.spacing['3xl'],  // 32  (was 72 — spacing[9])
  },
});

// ─── Section header (shared across all home sections) ─────────────────────────
export const shStyles = StyleSheet.create({
  row: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: theme.layout.pagePaddingH,
  },
  left: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  icon: {
    width:          34,
    height:         34,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    overflow:       "hidden",
  },
  title: { letterSpacing: -0.3 },
  moreBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               4,
    paddingHorizontal: 4,
  },
});

// ─── Quick-action row ──────────────────────────────────────────────────────────
export const quickStyles = StyleSheet.create({
  row: {
    flexDirection:     "row-reverse",
    gap:               10,
    paddingHorizontal: theme.layout.pagePaddingH,
  },
  // Outer animated wrapper — shadow/elevation only, no overflow clip
  shadow: {
    borderRadius:  20,
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius:  10,
    elevation:     5,
  },
  // Inner gradient tile — clips to rounded corners
  tile: {
    width:          62,
    height:         62,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  shine: {
    position:             "absolute",
    top:                  0,
    left:                 0,
    right:                0,
    height:               "50%",
    backgroundColor:      "rgba(255,255,255,0.14)",
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
  },
  label: {
    color:      theme.colors.slate[700],
    fontSize:   11,
    fontFamily: theme.fonts.bold,
    lineHeight: 14,
  },
});

// ─── Countdown timer ───────────────────────────────────────────────────────────
export const cntStyles = StyleSheet.create({
  timerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  colon:    {
    color:        theme.colors.slate[400],
    fontSize:     16,
    fontFamily:   theme.fonts.black,
    marginBottom: 12,
  },
  unit:  { alignItems: "center", gap: 3 },
  cell: {
    borderRadius:      10,
    paddingHorizontal: 9,
    paddingVertical:   6,
    minWidth:          36,
    alignItems:        "center",
    overflow:          "hidden",
  },
  value: {
    color:         "#fff",
    fontSize:      15,
    fontFamily:    theme.fonts.black,
    letterSpacing: 0.4,
  },
  unitLabel: { color: theme.colors.slate[400], fontSize: 9.5 },
});

// ─── Flash sale item wrappers ──────────────────────────────────────────────────
export const flashStyles = StyleSheet.create({
  // trailing marginEnd provides the gap without ItemSeparatorComponent
  itemWrap:    { width: 162, marginEnd: 12 },
  sectionGap:  { gap: theme.spacing[4] },
});

// ─── Featured product wrappers ─────────────────────────────────────────────────
export const featuredStyles = StyleSheet.create({
  itemWrap: { flex: 1 },
});

// ─── Pharmacist support card ───────────────────────────────────────────────────
export const supportStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing[4],     // 32 — intentional wider inset for floating card
    paddingTop:        theme.spacing['3xl'],  // 32  (was 72 — spacing[9])
  },
  card: {
    borderRadius:  24,
    padding:       20,
    gap:           18,
    overflow:      "hidden",
    shadowColor:   theme.colors.hero,
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius:  20,
    elevation:     10,
  },
  glow: {
    position:        "absolute",
    right:           -50,
    top:             -50,
    width:           140,
    height:          140,
    borderRadius:    70,
    backgroundColor: "rgba(13,184,168,0.12)",
  },
  ring: {
    position:     "absolute",
    right:        -10,
    top:          -10,
    width:        80,
    height:       80,
    borderRadius: 40,
    borderWidth:  1,
    borderColor:  "rgba(13,184,168,0.20)",
  },
  // "row" + RTL = icon on logical right, text fills flex: 1 in middle.
  // "row-reverse" was causing double-reversal → floating/aimless layout.
  row: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            14,
  },
  iconTile: {
    width:          52,
    height:         52,
    borderRadius:   16,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
    flexShrink:     0,   // never shrink the icon tile
  },
  title: {
    color:         "#FFFFFF",
    fontSize:      18,
    fontFamily:    theme.fonts.black,
    letterSpacing: -0.3,
    textAlign:     "right",
    marginTop:     theme.spacing[0.5],
  },
  sub: {
    color:      "rgba(255,255,255,0.55)",
    fontSize:   12,
    fontFamily: theme.fonts.regular,
    lineHeight: 18,
    textAlign:  "right",
    marginTop:  theme.spacing[0.5],
  },
  // CTA: WhatsApp icon + text on left; chevron pinned to right via space-between
  cta: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",   // was: center — chevron now pins to edge
    gap:               10,
    backgroundColor:   "#fff",
    borderRadius:      14,
    paddingHorizontal: 18,
    paddingVertical:   13,
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.08,
    shadowRadius:      6,
    elevation:         3,
  },
  ctaText: {
    flex:       1,                        // text fills available space
    color:      theme.colors.slate[900],
    fontSize:   14,
    fontFamily: theme.fonts.extrabold,
    textAlign:  "left",
  },
  ctaArrow: {},                           // chevron sits at end naturally via space-between
});
