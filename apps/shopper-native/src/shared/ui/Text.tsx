/**
 * Text — typography atom.
 *
 * Spec: SPEC §2.4 hierarchy.
 *
 * The `variant` prop fully specifies size + default weight + tracking per the
 * spec table. Pass `weight` only to override the default (e.g. a body row
 * that needs to read "bold"). Cairo has no 500 — "medium" maps to 400.
 *
 *   <Text variant="card-title">…</Text>
 *   <Text variant="body" color="secondary">…</Text>
 *   <Text variant="eyebrow" color="brand">NEXT REFILL</Text>
 */

import React from "react";
import {
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { theme } from "@/shared/theme";

export type TextVariant =
  | "display"       // 36 / black / very tight  — premium splash headlines
  | "hero"          // SPEC §2.4 — 32 / extrabold / tight
  | "screen-title"  // 24 / extrabold / tight
  | "sheet-title"   // 20 / extrabold / tight
  | "section-head"  // 18 / extrabold / normal
  | "card-title"    // 16 / bold / normal
  | "body"          // 15 / regular / normal
  | "body-sm"       // 14 / regular / normal
  | "caption"       // 12 / semibold / wide
  | "eyebrow"       // 11 / bold / widest
  | "badge"         // 11 / bold / widest
  | "metric";       // 28 / black / tight       — large numbers (price, count)

export type TextWeight =
  | "regular"
  | "medium"     // Cairo has no 500 — collapses to regular
  | "semibold"
  | "bold"
  | "extrabold"
  | "black";

export type TextColor =
  | "primary"
  | "secondary"
  | "muted"           // between secondary and tertiary
  | "tertiary"
  | "disabled"
  | "inverse"
  | "inverse-muted"   // muted-on-dark, e.g. hero subcopy
  | "brand"
  | "danger"
  | "warn"
  | "success"
  | "info";

export interface TextProps extends Omit<RNTextProps, "style"> {
  variant?:        TextVariant;
  weight?:         TextWeight;
  color?:          TextColor;
  align?:          TextStyle["textAlign"];
  numberOfLines?:  number;
  style?:          StyleProp<TextStyle>;
  children?:       React.ReactNode;
}

interface VariantSpec {
  fontSize:      number;
  lineHeight:    number;
  weight:        TextWeight;
  letterSpacing: number;
}

const VARIANTS: Record<TextVariant, VariantSpec> = {
  "display":      { ...theme.typography.size["7xl"], weight: "black",     letterSpacing: -1.0                                    },
  "hero":         { ...theme.typography.size["6xl"], weight: "extrabold", letterSpacing: theme.typography.letterSpacing.tight   },
  "screen-title": { ...theme.typography.size["4xl"], weight: "extrabold", letterSpacing: theme.typography.letterSpacing.tight   },
  "sheet-title":  { ...theme.typography.size["3xl"], weight: "extrabold", letterSpacing: -0.4                                    },
  "section-head": { ...theme.typography.size["2xl"], weight: "extrabold", letterSpacing: theme.typography.letterSpacing.normal  },
  "card-title":   { ...theme.typography.size.xl,     weight: "bold",      letterSpacing: theme.typography.letterSpacing.normal  },
  "body":         { ...theme.typography.size.lg,     weight: "regular",   letterSpacing: theme.typography.letterSpacing.normal  },
  "body-sm":      { ...theme.typography.size.md,     weight: "regular",   letterSpacing: theme.typography.letterSpacing.normal  },
  "caption":      { ...theme.typography.size.sm,     weight: "semibold",  letterSpacing: theme.typography.letterSpacing.wide    },
  "eyebrow":      { ...theme.typography.size.xs,     weight: "bold",      letterSpacing: theme.typography.letterSpacing.widest  },
  "badge":        { ...theme.typography.size.xs,     weight: "bold",      letterSpacing: theme.typography.letterSpacing.widest  },
  "metric":       { ...theme.typography.size["5xl"], weight: "black",     letterSpacing: -0.5                                    },
};

// ─── Pre-computed StyleSheet entries — allocated once at module load, never per render ─
//
// Strategy:
//   Common case (no weight override) → VARIANT_STYLES[variant] + COLOR_STYLES[color]
//   Weight override               → VARIANT_LAYOUT_STYLES[variant] + FONT_STYLES[weight] + COLOR_STYLES[color]
//   Align override                → + ALIGN_STYLES[align]  (pre-built for all 5 RN values)
// Each entry is a stable StyleSheet ID, not a new object, so referential equality holds
// across renders and the consumer's React.memo comparators are not broken.

// Variant base: size + spacing + the variant's default font weight.
// This covers the common render path where the `weight` prop is not overridden.
const _variantInput: Record<TextVariant, TextStyle> = {
  "display":      { fontSize: VARIANTS["display"].fontSize,       lineHeight: VARIANTS["display"].lineHeight,       letterSpacing: VARIANTS["display"].letterSpacing,       fontFamily: theme.fonts[VARIANTS["display"].weight]      },
  "hero":         { fontSize: VARIANTS["hero"].fontSize,          lineHeight: VARIANTS["hero"].lineHeight,          letterSpacing: VARIANTS["hero"].letterSpacing,          fontFamily: theme.fonts[VARIANTS["hero"].weight]         },
  "screen-title": { fontSize: VARIANTS["screen-title"].fontSize,  lineHeight: VARIANTS["screen-title"].lineHeight,  letterSpacing: VARIANTS["screen-title"].letterSpacing,  fontFamily: theme.fonts[VARIANTS["screen-title"].weight] },
  "sheet-title":  { fontSize: VARIANTS["sheet-title"].fontSize,   lineHeight: VARIANTS["sheet-title"].lineHeight,   letterSpacing: VARIANTS["sheet-title"].letterSpacing,   fontFamily: theme.fonts[VARIANTS["sheet-title"].weight]  },
  "section-head": { fontSize: VARIANTS["section-head"].fontSize,  lineHeight: VARIANTS["section-head"].lineHeight,  letterSpacing: VARIANTS["section-head"].letterSpacing,  fontFamily: theme.fonts[VARIANTS["section-head"].weight] },
  "card-title":   { fontSize: VARIANTS["card-title"].fontSize,    lineHeight: VARIANTS["card-title"].lineHeight,    letterSpacing: VARIANTS["card-title"].letterSpacing,    fontFamily: theme.fonts[VARIANTS["card-title"].weight]   },
  "body":         { fontSize: VARIANTS["body"].fontSize,          lineHeight: VARIANTS["body"].lineHeight,          letterSpacing: VARIANTS["body"].letterSpacing,          fontFamily: theme.fonts[VARIANTS["body"].weight]         },
  "body-sm":      { fontSize: VARIANTS["body-sm"].fontSize,       lineHeight: VARIANTS["body-sm"].lineHeight,       letterSpacing: VARIANTS["body-sm"].letterSpacing,       fontFamily: theme.fonts[VARIANTS["body-sm"].weight]      },
  "caption":      { fontSize: VARIANTS["caption"].fontSize,       lineHeight: VARIANTS["caption"].lineHeight,       letterSpacing: VARIANTS["caption"].letterSpacing,       fontFamily: theme.fonts[VARIANTS["caption"].weight]      },
  "eyebrow":      { fontSize: VARIANTS["eyebrow"].fontSize,       lineHeight: VARIANTS["eyebrow"].lineHeight,       letterSpacing: VARIANTS["eyebrow"].letterSpacing,       fontFamily: theme.fonts[VARIANTS["eyebrow"].weight]      },
  "badge":        { fontSize: VARIANTS["badge"].fontSize,         lineHeight: VARIANTS["badge"].lineHeight,         letterSpacing: VARIANTS["badge"].letterSpacing,         fontFamily: theme.fonts[VARIANTS["badge"].weight]        },
  "metric":       { fontSize: VARIANTS["metric"].fontSize,        lineHeight: VARIANTS["metric"].lineHeight,        letterSpacing: VARIANTS["metric"].letterSpacing,        fontFamily: theme.fonts[VARIANTS["metric"].weight]       },
};
const VARIANT_STYLES = StyleSheet.create(_variantInput);

// Layout-only styles: size + spacing, no fontFamily.
// Used together with FONT_STYLES when the caller overrides the weight prop.
const _layoutInput: Record<TextVariant, TextStyle> = {
  "display":      { fontSize: VARIANTS["display"].fontSize,       lineHeight: VARIANTS["display"].lineHeight,       letterSpacing: VARIANTS["display"].letterSpacing       },
  "hero":         { fontSize: VARIANTS["hero"].fontSize,          lineHeight: VARIANTS["hero"].lineHeight,          letterSpacing: VARIANTS["hero"].letterSpacing          },
  "screen-title": { fontSize: VARIANTS["screen-title"].fontSize,  lineHeight: VARIANTS["screen-title"].lineHeight,  letterSpacing: VARIANTS["screen-title"].letterSpacing  },
  "sheet-title":  { fontSize: VARIANTS["sheet-title"].fontSize,   lineHeight: VARIANTS["sheet-title"].lineHeight,   letterSpacing: VARIANTS["sheet-title"].letterSpacing   },
  "section-head": { fontSize: VARIANTS["section-head"].fontSize,  lineHeight: VARIANTS["section-head"].lineHeight,  letterSpacing: VARIANTS["section-head"].letterSpacing  },
  "card-title":   { fontSize: VARIANTS["card-title"].fontSize,    lineHeight: VARIANTS["card-title"].lineHeight,    letterSpacing: VARIANTS["card-title"].letterSpacing    },
  "body":         { fontSize: VARIANTS["body"].fontSize,          lineHeight: VARIANTS["body"].lineHeight,          letterSpacing: VARIANTS["body"].letterSpacing          },
  "body-sm":      { fontSize: VARIANTS["body-sm"].fontSize,       lineHeight: VARIANTS["body-sm"].lineHeight,       letterSpacing: VARIANTS["body-sm"].letterSpacing       },
  "caption":      { fontSize: VARIANTS["caption"].fontSize,       lineHeight: VARIANTS["caption"].lineHeight,       letterSpacing: VARIANTS["caption"].letterSpacing       },
  "eyebrow":      { fontSize: VARIANTS["eyebrow"].fontSize,       lineHeight: VARIANTS["eyebrow"].lineHeight,       letterSpacing: VARIANTS["eyebrow"].letterSpacing       },
  "badge":        { fontSize: VARIANTS["badge"].fontSize,         lineHeight: VARIANTS["badge"].lineHeight,         letterSpacing: VARIANTS["badge"].letterSpacing         },
  "metric":       { fontSize: VARIANTS["metric"].fontSize,        lineHeight: VARIANTS["metric"].lineHeight,        letterSpacing: VARIANTS["metric"].letterSpacing        },
};
const VARIANT_LAYOUT_STYLES = StyleSheet.create(_layoutInput);

// One fontFamily entry per weight — applied as a separate layer only when weight prop overrides.
const _fontInput: Record<TextWeight, TextStyle> = {
  regular:   { fontFamily: theme.fonts.regular   },
  medium:    { fontFamily: theme.fonts.medium    },
  semibold:  { fontFamily: theme.fonts.semibold  },
  bold:      { fontFamily: theme.fonts.bold      },
  extrabold: { fontFamily: theme.fonts.extrabold },
  black:     { fontFamily: theme.fonts.black     },
};
const FONT_STYLES = StyleSheet.create(_fontInput);

// One color entry per text color token.
const _colorInput: Record<TextColor, TextStyle> = {
  primary:         { color: theme.colors.text.primary      },
  secondary:       { color: theme.colors.text.secondary    },
  muted:           { color: theme.colors.text.muted        },
  tertiary:        { color: theme.colors.text.tertiary     },
  disabled:        { color: theme.colors.text.disabled     },
  inverse:         { color: theme.colors.text.inverse      },
  "inverse-muted": { color: theme.colors.text.inverseSoft  },
  brand:           { color: theme.colors.brand.base        },
  danger:          { color: theme.colors.error.base        },
  warn:            { color: theme.colors.warning.base      },
  success:         { color: theme.colors.success.base      },
  info:            { color: theme.colors.info.base         },
};
const COLOR_STYLES = StyleSheet.create(_colorInput);

// Pre-computed textAlign styles — covers every valid React Native textAlign value.
// The Record<string, TextStyle> intermediate type lets us index with the textAlign union.
const _alignInput: Record<string, TextStyle> = {
  auto:    { textAlign: "auto"    },
  left:    { textAlign: "left"    },
  right:   { textAlign: "right"   },
  center:  { textAlign: "center"  },
  justify: { textAlign: "justify" },
};
const ALIGN_STYLES: Record<string, TextStyle> = StyleSheet.create(_alignInput);

// Arabic font-clipping fix — applied to every UIText instance.
// includeFontPadding: false   removes Android's extra bottom padding that clips
//                             Arabic descenders (ي، ق، etc.) and diacritics.
// textAlignVertical: 'center' centres glyphs vertically within the line box so
//                             taller Arabic letterforms don't shift baseline.
const TEXT_BASE = StyleSheet.create({
  fix: {
    includeFontPadding:  false,
    textAlignVertical:   "center",
  } as TextStyle,
}).fix;

export function Text({
  variant = "body",
  weight,
  color   = "primary",
  align,
  style,
  children,
  ...rest
}: TextProps): React.ReactElement {
  // Common path (no weight override): two stable StyleSheet IDs, zero per-render allocation.
  // Weight override: three stable IDs. Align override: one additional stable ID.
  const baseStyle  = weight != null ? VARIANT_LAYOUT_STYLES[variant] : VARIANT_STYLES[variant];
  const fontStyle  = weight != null ? FONT_STYLES[weight]             : null;
  const alignStyle = align  != null ? ALIGN_STYLES[align] ?? null     : null;

  // TEXT_BASE injected before caller style so caller can still override
  // includeFontPadding / textAlignVertical for edge-case layouts if needed.
  return (
    <RNText
      {...rest}
      style={[TEXT_BASE, baseStyle, fontStyle, COLOR_STYLES[color], alignStyle, style]}>
      {children}
    </RNText>
  );
}
