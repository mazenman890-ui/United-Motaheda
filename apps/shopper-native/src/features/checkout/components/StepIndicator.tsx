import React from "react";
import { View } from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/shared/theme";
import { stepBarStyles as s } from "./checkout.styles";

interface StepPillProps {
  index:  number;
  label:  string;
  active: boolean;
  done:   boolean;
}

export const StepPill = React.memo(function StepPill({
  index,
  label,
  active,
  done,
}: StepPillProps) {
  const bg = done
    ? theme.colors.success.bg
    : active
    ? theme.colors.brand.lighter
    : theme.colors.slate[50];
  const fg = done
    ? theme.colors.success.strong
    : active
    ? theme.colors.brand[700]
    : theme.colors.slate[500];

  return (
    <View style={[s.pill, { backgroundColor: bg }, active && s.pillActive]}>
      <View style={[s.num, { backgroundColor: fg }]}>
        {done ? (
          <Ionicons name="checkmark" size={11} color="#fff" />
        ) : (
          <UIText style={s.numText}>{index}</UIText>
        )}
      </View>
      <UIText style={[s.label, { color: fg }]}>{label}</UIText>
    </View>
  );
});

export const StepLine = React.memo(function StepLine({ done }: { done: boolean }) {
  return (
    <View
      style={[s.line, done && { backgroundColor: theme.colors.success.base }]}
    />
  );
});
