/**
 * Styles for the Order Detail screen.
 * All spacing uses theme.spacing tokens; all colours use theme.colors.
 */
import { StyleSheet } from "react-native";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";
import { theme } from "@/shared/theme";

export const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  centerScreen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom:     14,
    paddingTop:        10,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
    shadowColor:       theme.colors.hero,
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.04,
    shadowRadius:      6,
    elevation:         2,
  },
  headerOrderId: {
    letterSpacing: -0.3,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: theme.colors.subtle,
    alignItems:      "center",
    justifyContent:  "center",
  },
  scrollContent: {
    padding: theme.layout.pagePaddingH,
    gap:     14,
  },

  // Meta chips
  metaRow: {
    flexDirection: flexRow(isRtl()),
    flexWrap:      "wrap",
    gap:           theme.spacing.sm,
    marginBottom:  2,
  },
  metaChip: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    backgroundColor:   theme.colors.slate[50],
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      999,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },

  // Section card
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    ...theme.shadow.card,
  },
  sectionHeader: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: theme.spacing.lg,
    paddingTop:        14,
    paddingBottom:     theme.spacing.sm,
  },
  sectionIconBox: {
    width:           30,
    height:          30,
    borderRadius:    10,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  sectionTitle: {
    letterSpacing: -0.2,
  },
  sectionBody: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom:     theme.spacing.lg,
    paddingTop:        theme.spacing.xs,
    gap:               10,
  },

  // Timeline
  timelineRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "flex-start",
    marginBottom:  theme.spacing.xs,
  },
  timelineLeft: {
    alignItems: "center",
    width:      36,
    marginLeft: theme.spacing.xs,
  },
  timelineDot: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     "center",
    justifyContent: "center",
  },
  timelineDotDone: {
    backgroundColor: theme.colors.brand[600],
  },
  timelineDotPending: {
    backgroundColor: theme.colors.slate[100],
    borderWidth:     1,
    borderColor:     theme.colors.slate[200],
  },
  timelineLine: {
    width:           2,
    height:          20,
    marginTop:       3,
    backgroundColor: theme.colors.slate[200],
    borderRadius:    1,
  },
  timelineLineDone: {
    backgroundColor: theme.colors.brand[300],
  },
  timelineText: {
    textAlign:   textAlignStart(isRtl()),
    flex:        1,
    marginRight: theme.spacing.md,
  },

  // Item cards
  itemCard: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             theme.spacing.md,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    14,
    padding:         theme.spacing.md,
  },
  itemImage: {
    width:        60,
    height:       60,
    borderRadius: 10,
    overflow:     "hidden",
  },
  itemImagePlaceholder: {
    backgroundColor: theme.colors.slate[100],
    alignItems:      "center",
    justifyContent:  "center",
  },
  itemMeta: {
    flexDirection:  flexRow(isRtl()),
    justifyContent: "space-between",
    marginTop:      theme.spacing.xs,
  },

  // Address
  addressCard: {
    backgroundColor: theme.colors.slate[50],
    borderRadius:    14,
    padding:         14,
    gap:             10,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
  },
  addressRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           10,
  },
  addressText: {
    textAlign: textAlignStart(isRtl()),
    flex:      1,
  },

  // Payment
  paymentCard: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           theme.spacing.md,
    borderRadius:  14,
    padding:       14,
  },
  paymentIconBox: {
    width:           44,
    height:          44,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.card,
  },
  paymentStatusRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           theme.spacing.xs,
    marginTop:     theme.spacing.xs,
  },
  transferRow: {
    flexDirection:     flexRow(isRtl()),
    justifyContent:    "space-between",
    alignItems:        "center",
    paddingVertical:   10,
    paddingHorizontal: theme.spacing.md,
    borderRadius:      10,
    backgroundColor:   theme.colors.slate[50],
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  proofContainer: {
    marginTop: theme.spacing.xs,
  },
  proofImage: {
    width:           "100%",
    height:          220,
    borderRadius:    14,
    overflow:        "hidden",
    backgroundColor: theme.colors.slate[100],
  },

  // Price
  infoRow: {
    flexDirection:  flexRow(isRtl()),
    justifyContent: "space-between",
    alignItems:     "center",
    paddingVertical: 3,
  },
  priceDivider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  6,
  },
  priceDividerSpaced: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  theme.spacing.md,
  },
  totalRow: {
    flexDirection:  flexRow(isRtl()),
    justifyContent: "space-between",
    alignItems:     "baseline",
  },

  // Error state
  errorState: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: theme.spacing[4],
    paddingBottom:     80,
  },
  retryBtn: {
    marginTop:         theme.spacing[2.5],
    paddingHorizontal: theme.spacing[3],
    paddingVertical:   theme.spacing.md,
    borderRadius:      12,
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
  },
});
