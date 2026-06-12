/**
 * kit/tokens — the 2026 visual language. A clean break from the legacy theme.
 *
 * Philosophy (Linear / Stripe / Arc-class light UI):
 *   • One ink. Near-black navy carries all primary emphasis — no gradient CTAs.
 *   • One accent. Deep pharmacy teal, used sparingly for selection + meaning.
 *   • Cool near-white canvas, pure-white surfaces, hairline separation.
 *   • Layered soft shadows (ambient + key) instead of heavy drop shadows.
 *   • 4pt spacing grid, three radii tiers, quiet semantic tints.
 *
 * Screens built on this kit must NOT mix in legacy `theme.gradients.*` or the
 * old dark hero headers — the kit is light-first end to end.
 */

export const kit = {
  color: {
    /** App background — cool near-white. */
    canvas:     "#F6F8FB",
    /** Cards, sheets, bars. */
    surface:    "#FFFFFF",
    /** Sunken wells inside surfaces (input fields, image stages). */
    well:       "#EFF3F8",

    /** Primary ink — headings, primary buttons, selected states. */
    ink:        "#0A1220",
    /** Secondary text. */
    inkSoft:    "#4A5568",
    /** Tertiary / placeholder / disabled text. */
    inkFaint:   "#97A2B4",

    /** Hairline border on surfaces. */
    line:       "rgba(10,18,32,0.07)",
    /** Slightly stronger border (focused controls). */
    lineStrong: "rgba(10,18,32,0.14)",

    /** Brand accent — deep teal. */
    accent:     "#0E7E74",
    accentDeep: "#0A5F58",
    accentTint: "#E6F4F2",

    /** Semantic. */
    success:     "#15803D",
    successTint: "#EAF7EF",
    warn:        "#B45309",
    warnTint:    "#FEF3E2",
    danger:      "#B3261E",
    dangerTint:  "#FCEEED",

    onInk: "#FFFFFF",
  },

  radius: {
    control: 14,
    card:    20,
    sheet:   28,
    pill:    999,
  },

  /** Layered soft elevation. Spread shadows, low opacity. */
  shadow: {
    raised: {
      shadowColor:   "#0A1220",
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius:  10,
      elevation:     2,
    },
    floating: {
      shadowColor:   "#0A1220",
      shadowOffset:  { width: 0, height: 12 },
      shadowOpacity: 0.10,
      shadowRadius:  28,
      elevation:     8,
    },
  },

  /** 4pt grid helper: sp(4) = 16. */
  sp: (n: number) => n * 4,

  /** Type scale (Cairo family supplied by theme.fonts at the call site). */
  type: {
    display: { fontSize: 32, lineHeight: 42 },
    title:   { fontSize: 22, lineHeight: 30 },
    heading: { fontSize: 16, lineHeight: 24 },
    body:    { fontSize: 14, lineHeight: 22 },
    label:   { fontSize: 12, lineHeight: 18 },
    micro:   { fontSize: 10, lineHeight: 15 },
  },
} as const;

export type Kit = typeof kit;
