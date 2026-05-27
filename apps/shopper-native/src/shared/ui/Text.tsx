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
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { theme } from "@/theme";

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

const COLORS: Record<TextColor, string> = {
  primary:         theme.colors.text.primary,
  secondary:       theme.colors.text.secondary,
  muted:           theme.colors.text.muted,
  tertiary:        theme.colors.text.tertiary,
  disabled:        theme.colors.text.disabled,
  inverse:         theme.colors.text.inverse,
  "inverse-muted": theme.colors.text.inverseSoft,
  brand:           theme.colors.brand.base,
  danger:          theme.colors.error.base,
  warn:            theme.colors.warning.base,
  success:         theme.colors.success.base,
  info:            theme.colors.info.base,
};

export function Text({
  variant = "body",
  weight,
  color   = "primary",
  align,
  style,
  children,
  ...rest
}: TextProps): React.ReactElement {
  const spec       = VARIANTS[variant];
  const finalWeight = weight ?? spec.weight;

  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily:    theme.fonts[finalWeight],
          fontSize:      spec.fontSize,
          lineHeight:    spec.lineHeight,
          letterSpacing: spec.letterSpacing,
          color:         COLORS[color],
          textAlign:     align,
        },
        style,
      ]}>
      {children}
    </RNText>
  );
}
