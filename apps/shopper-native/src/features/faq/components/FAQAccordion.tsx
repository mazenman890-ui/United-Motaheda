import React, { memo, useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { theme } from "@/shared/theme";
import type { FAQItem } from "../data";
import { FAQ_CATEGORIES } from "../data";

interface Props {
  item: FAQItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) };

export const FAQAccordion = memo(function FAQAccordion({
  item,
  index,
  expanded,
  onToggle,
}: Props) {
  const cat = FAQ_CATEGORIES.find((c) => c.key === item.category) ?? FAQ_CATEGORIES[0];

  // Reanimated chevron rotation — consistent with rest of app's motion system
  const rotation = useSharedValue(expanded ? 1 : 0);

  React.useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, TIMING);
  }, [expanded, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onToggle();
  }, [onToggle]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(220)}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={item.question}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? "اضغط لإغلاق الإجابة" : "اضغط لعرض الإجابة"}
        style={[styles.card, expanded && styles.cardExpanded]}>

        {/* Question row */}
        <View style={styles.questionRow}>
          <View style={[styles.catDot, { backgroundColor: cat.color }]} />
          <Text
            style={[styles.question, expanded && styles.questionExpanded]}
            numberOfLines={expanded ? undefined : 2}>
            {item.question}
          </Text>
          <Animated.View style={[styles.chevronWrap, expanded && styles.chevronWrapExpanded, chevronStyle]}>
            <Ionicons
              name="chevron-down"
              size={14}
              color={expanded ? theme.colors.brand[600] : theme.colors.slate[400]}
            />
          </Animated.View>
        </View>

        {/* Answer (progressive disclosure) */}
        {expanded && (
          <Animated.View entering={FadeIn.duration(180)} style={styles.answerWrap}>
            <View style={styles.answerDivider} />
            <Text style={styles.answer}>{item.answer}</Text>
            <View style={styles.catPill}>
              <Text style={[styles.catPillText, { color: cat.color }]}>{cat.label}</Text>
            </View>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    ...theme.shadow.xs,
  },
  cardExpanded: {
    borderColor: theme.colors.brand[100],
    ...theme.shadow.sm,
  },
  questionRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  question: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[700],
    textAlign: "right",
    lineHeight: 20,
  },
  questionExpanded: {
    color: theme.colors.text.primary,
    fontFamily: theme.fonts.black,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: theme.colors.slate[50],
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapExpanded: {
    backgroundColor: theme.colors.brand[50],
  },
  answerWrap: {
    marginTop: 12,
    gap: 10,
  },
  answerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.slate[100],
  },
  answer: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "right",
    lineHeight: 20,
  },
  catPill: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.slate[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  catPillText: {
    fontSize: 9,
    fontFamily: theme.fonts.bold,
  },
});
