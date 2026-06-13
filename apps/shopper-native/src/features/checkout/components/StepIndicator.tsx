import React from "react";
import { View } from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/shared/theme";
import { kit } from "@/shared/kit";
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
    ? kit.color.successTint
    : active
    ? kit.color.accentTint
    : kit.color.well;
  const fg = done
    ? kit.color.success
    : active
    ? kit.color.accentDeep
    : kit.color.inkFaint;

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
      style={[s.line, done && { backgroundColor: kit.color.success }]}
    />
  );
});
