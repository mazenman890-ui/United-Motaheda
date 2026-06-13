import React from "react";
import { View, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Text as UIText } from "@/shared/ui";
import { kit } from "@/shared/kit";
import { sectionStyles as s } from "./checkout.styles";
import { FORWARD_CHEVRON } from "@/utils/layout";
import type { IoniconsName } from "../constants";

interface SectionCardProps {
  title:    string;
  icon:     IoniconsName;
  delay:    number;
  action?:  { label: string; onPress: () => void };
  children: React.ReactNode;
}

export const SectionCard = React.memo(function SectionCard({
  title,
  icon,
  delay,
  action,
  children,
}: SectionCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(360)} style={s.card}>
      <View style={s.head}>
        <View style={s.titleWrap}>
          <View style={s.icon}>
            <Ionicons name={icon} size={14} color={kit.color.accentDeep} />
          </View>
          <UIText variant="card-title" align="right">
            {title}
          </UIText>
        </View>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={6} style={s.actionWrap}>
            <UIText variant="caption" color="brand" weight="bold">
              {action.label}
            </UIText>
            <Ionicons name={FORWARD_CHEVRON} size={12} color={kit.color.accentDeep} />
          </Pressable>
        )}
      </View>
      <View style={s.body}>{children}</View>
    </Animated.View>
  );
});
