/**
 * Shared styles for the Profile screen family.
 *
 * Intentional non-token values (documented):
 *   HERO_GLASS   — white glass overlays on the dark hero gradient
 *   PROFILE      — feature-specific accent colours without theme tokens
 */
import { StyleSheet } from "react-native";
import { theme } from "@/shared/theme";

// ─── Glass overlay constants ──────────────────────────────────────────────────
/** Semi-transparent white values for glass surfaces on the hero gradient. */
export const HERO_GLASS = {
  w02:  "rgba(255,255,255,0.02)",
  w025: "rgba(255,255,255,0.025)",
  w04:  "rgba(255,255,255,0.04)",
  w10:  "rgba(255,255,255,0.10)",
  w12:  "rgba(255,255,255,0.12)",
  w13:  "rgba(255,255,255,0.13)",
  w15:  "rgba(255,255,255,0.15)",
  w16:  "rgba(255,255,255,0.16)",
  w18:  "rgba(255,255,255,0.18)",
  w25:  "rgba(255,255,255,0.25)",
  w45:  "rgba(255,255,255,0.45)",
  w55:  "rgba(255,255,255,0.55)",
  w65:  "rgba(255,255,255,0.65)",
  w70:  "rgba(255,255,255,0.70)",
  w80:  "rgba(255,255,255,0.80)",
  w90:  "rgba(255,255,255,0.90)",
  w92:  "rgba(255,255,255,0.92)",
  w95:  "rgba(255,255,255,0.95)",
} as const;

/** Profile-specific accent colours without theme palette tokens. */
export const PROFILE = {
  loyaltyPurple: "#9333EA",  // purple-600 — loyalty accent
  loyaltyViolet: "#7C3AED",  // violet-600 — loyalty gradient start
  wishlistRed:   "#E11D48",  // rose-600   — wishlist gradient
  whatsappGreen: "#25D366",  // WhatsApp brand green
  shadowDark:    "#000000",  // pure black — icon shadow wrapper
} as const;

// ─── StyleSheet ───────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // ── Hero (logged in) ──
  hero: {
    paddingHorizontal: 20,
    paddingBottom:     58,
    overflow:          "hidden",
  },
  heroDecor1: {
    position:        "absolute",
    right:           -40,
    top:             -40,
    width:           140,
    height:          140,
    borderRadius:    70,
    backgroundColor: HERO_GLASS.w04,
  },
  heroDecor2: {
    position:        "absolute",
    left:            -30,
    bottom:          -50,
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: HERO_GLASS.w025,
  },
  heroDecor3: {
    position:        "absolute",
    right:           60,
    top:             40,
    width:           50,
    height:          50,
    borderRadius:    25,
    backgroundColor: HERO_GLASS.w02,
  },
  heroTopBar: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   22,
  },
  heroPageLabelNew: {
    color: HERO_GLASS.w55,
  },
  heroIconBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: HERO_GLASS.w10,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     HERO_GLASS.w12,
    position:        "relative",
  },
  heroIconBadge: {
    position:          "absolute",
    top:               -4,
    left:              -4,
    minWidth:          18,
    height:            18,
    paddingHorizontal: theme.spacing.xs,
    borderRadius:      9,
    backgroundColor:   theme.colors.error.base,
    borderWidth:       2,
    borderColor:       theme.colors.hero,
    alignItems:        "center",
    justifyContent:    "center",
  },
  heroIconBadgeText: {
    color:      theme.colors.surface,
    fontSize:   10,
    lineHeight: 12,
    fontFamily: theme.fonts.extrabold,
  },

  // ── Avatar ──
  heroIdentity:    { alignItems: "center", gap: 5 },
  avatarContainer: { position: "relative", marginBottom: 10 },
  avatarGlow: {
    position:     "absolute",
    top:          -4,
    left:         -4,
    right:        -4,
    bottom:       -4,
    borderRadius: 30,
    opacity:      0.6,
  },
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    26,
    backgroundColor: theme.colors.surface,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     3,
    borderColor:     HERO_GLASS.w25,
  },
  avatarLetter: {
    fontSize:   32,
    fontFamily: theme.fonts.black,
    color:      theme.colors.heroMid,
  },
  tierBadge: {
    position:       "absolute",
    bottom:         -3,
    right:          -3,
    width:          24,
    height:         24,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    2.5,
    borderColor:    theme.colors.surface,
  },
  heroTextGroup: { alignItems: "center", gap: theme.spacing.xs },
  userNameNew:   { letterSpacing: -0.4 },

  // ── Tier chip ──
  tierChip: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               7,
    backgroundColor:   HERO_GLASS.w13,
    borderRadius:      999,
    paddingHorizontal: 14,
    paddingVertical:   7,
    marginTop:         10,
    borderWidth:       1,
    borderColor:       HERO_GLASS.w15,
  },
  tierChipLabelNew: { color: HERO_GLASS.w92 },
  pointsChip: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               3,
    backgroundColor:   HERO_GLASS.w12,
    borderRadius:      999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical:   2,
  },
  pointsChipTextNew: { color: theme.colors.surface },
  pointsChipUnitNew: { color: HERO_GLASS.w70 },

  // ── Guest hero ──
  guestHero: {
    paddingHorizontal: theme.layout.pagePaddingH,  // 20 — consistent with auth hero
    paddingBottom:     34,
    alignItems:        "center",
    gap:               10,
    overflow:          "hidden",
  },
  guestAvatar: {
    width:           78,
    height:          78,
    borderRadius:    26,
    backgroundColor: HERO_GLASS.w10,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     HERO_GLASS.w15,
    marginBottom:    theme.spacing.xs,
  },
  guestTitleNew: {
    letterSpacing: -0.4,
    marginTop:     theme.spacing.sm,
  },
  guestDescNew: {
    lineHeight: 20,
    maxWidth:   320,
  },
  guestActions: {
    width:     "100%",
    marginTop: theme.spacing.lg,
    gap:       9,
  },
  guestPrimaryBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    paddingVertical: 14,
    alignItems:      "center",
    ...theme.shadow.md,
  },
  guestSecondaryBtn: {
    backgroundColor: HERO_GLASS.w10,
    borderRadius:    16,
    paddingVertical: 14,
    alignItems:      "center",
    borderWidth:     1,
    borderColor:     HERO_GLASS.w18,
  },

  // ── Stats card — clinical lifted surface, hairline dividers ──
  statsCard: {
    flexDirection:     "row-reverse",
    backgroundColor:   theme.colors.surface,
    marginHorizontal:  theme.layout.pagePaddingH,  // 20 — matches section bounds
    marginTop:         -36,
    borderRadius:      20,
    paddingVertical:   18,
    paddingHorizontal: theme.spacing.xs,
    ...theme.shadow.lg,
    shadowOpacity:     0.10,
  },
  statCol: {
    flex:       1,
    alignItems: "center",
    gap:        6,
  },
  statIconWrap: {
    width:          34,
    height:         34,
    borderRadius:   11,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   2,
    borderWidth:    1,
  },
  statDivider: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  10,
  },
  statValueNew: { letterSpacing: -0.3 },

  // ── Quick last-order card ──
  quickCardWrap: {
    paddingHorizontal: theme.layout.pagePaddingH,  // 20 — matches section bounds
    marginTop:         14,
  },
  quickCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    ...theme.shadow.card,
  },
  quickCardIcon: {
    width:           42,
    height:          42,
    borderRadius:    13,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  quickCardSubNew: {
    marginTop:     2,
    textTransform: "none" as const,
    letterSpacing: 0,
  },
  statusDot: {
    width:           7,
    height:          7,
    borderRadius:    3.5,
    backgroundColor: theme.colors.success.base,
  },

  // ── Quick action grid ──
  quickGrid: {
    flexDirection:     "row-reverse",
    gap:               10,
    paddingHorizontal: theme.layout.pagePaddingH,  // 20 — matches section bounds
    marginTop:         18,
  },
  quickGridItem: {
    flex:              1,
    backgroundColor:   theme.colors.surface,
    borderRadius:      16,
    paddingVertical:   theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    alignItems:        "center",
    gap:               10,
    shadowColor:       theme.colors.hero,
    shadowOffset:      { width: 0, height: 3 },
    shadowOpacity:     0.08,
    shadowRadius:      8,
    elevation:         3,
  },
  quickGridIconShadow: {
    borderRadius:  16,
    shadowColor:   PROFILE.shadowDark,
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius:  8,
    elevation:     4,
  },
  quickGridIconWrap: {
    width:          52,
    height:         52,
    borderRadius:   16,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  quickGridShine: {
    position:             "absolute",
    top:                  0,
    left:                 0,
    right:                0,
    height:               "50%",
    backgroundColor:      HERO_GLASS.w16,
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: theme.layout.pagePaddingH,  // 20 — forces whole group to pagePaddingH bounds
    marginTop:         theme.spacing['2xl'],        // 24
    gap:               10,
  },
  sectionLabelNew: {
    marginBottom: theme.spacing.xs,
  },

  // ── Menu card — pure white surface for premium iOS Settings look ──
  menuCard: {
    backgroundColor: theme.colors.surface,   // white card on bg background
    borderRadius:    16,
    overflow:        "hidden",
    ...theme.shadow.sm,
  },

  // ── Menu row ──
  // "row" + RTL system flag = icon on logical right, chevron on logical left.
  // "row-reverse" was causing double-reversal (RTL flip + row-reverse = LTR),
  // which destroyed the visual hierarchy.
  menuRow: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical:   16,           // was 15 — strict 16px spec
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  menuIcon: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
  },
  menuTextWrap: {
    flex: 1,
    gap:  2,
  },
  menuSubtitleNew: {
    marginTop:     2,
    textTransform: "none" as const,
    letterSpacing: 0,
  },
  badge: {
    minWidth:          24,
    height:            24,
    borderRadius:      12,
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: theme.spacing.sm,
  },

  // ── Footer ──
  footer: {
    alignItems:    "center",
    marginTop:     theme.spacing[4],
    gap:           6,
    paddingBottom: theme.spacing.md,
  },
  footerBrand: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               6,
    backgroundColor:   theme.colors.brand.lighter,
    borderRadius:      999,
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
  },
  footerVersionNew: {
    marginTop: theme.spacing.xs,
  },
});
