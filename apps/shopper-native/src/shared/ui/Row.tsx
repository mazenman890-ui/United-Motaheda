/**
 * Row / Stack — flexbox layout primitives with built-in gap.
 *
 * Replaces `<View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>`
 * patterns scattered across screens.
 *
 * `Row` defaults to the app's current direction (RTL → "row-reverse", LTR → "row").
 * Pass `ltr` to force left-to-right regardless of language setting.
 */

import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { flexRow } from "@/utils/layout";

type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

const ALIGN_MAP: Record<Align, ViewStyle["alignItems"]> = {
  start:    "flex-start",
  center:   "center",
  end:      "flex-end",
  stretch:  "stretch",
  baseline: "baseline",
};

const JUSTIFY_MAP: Record<Justify, ViewStyle["justifyContent"]> = {
  start:   "flex-start",
  center:  "center",
  end:     "flex-end",
  between: "space-between",
  around:  "space-around",
  evenly:  "space-evenly",
};

interface CommonProps {
  children?: React.ReactNode;
  gap?: number;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface RowProps extends CommonProps {
  /** Force LTR direction (default is row-reverse for RTL). */
  ltr?: boolean;
}

export function Row({
  children,
  gap = 0,
  align = "center",
  justify = "start",
  wrap,
  ltr,
  style,
}: RowProps) {
  return (
    <View
      style={[
        {
          flexDirection: ltr ? "row" : flexRow(),
          alignItems: ALIGN_MAP[align],
          justifyContent: JUSTIFY_MAP[justify],
          flexWrap: wrap ? "wrap" : "nowrap",
          gap,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Stack({
  children,
  gap = 0,
  align = "stretch",
  justify = "start",
  style,
}: CommonProps) {
  return (
    <View
      style={[
        {
          flexDirection: "column",
          alignItems: ALIGN_MAP[align],
          justifyContent: JUSTIFY_MAP[justify],
          gap,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** A flexible spacer that grows to fill available space. */
export function Spacer({ size }: { size?: number }) {
  return <View style={size != null ? { width: size, height: size } : StyleSheet.absoluteFill} />;
}
