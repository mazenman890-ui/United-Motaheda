import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { AppHeader } from "@/shared/components";
import { theme } from "@/shared/theme";
import { emptyS, EMPTY_GRAD } from "./orders.styles";

// Category chip palette — intentional category-specific bg/accent colours
const CAT_CHIPS = [
  { icon: "leaf-outline"     as const, labelKey: "home.qaVitamins", color: "#059669", bg: "#D1FAE5" },
  { icon: "sparkles-outline" as const, labelKey: "home.qaMomBaby",  color: "#7C3AED", bg: "#EDE9FE" },
  { icon: "medkit-outline"   as const, labelKey: "home.qaRx",       color: theme.colors.brand[600], bg: "#E0F2FE" },
] as const;

export function EmptyOrdersState({ showBack }: { showBack: boolean }): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(withTiming(-9, { duration: 2000 }), withTiming(0, { duration: 2000 })),
      -1, false,
    );
  }, [floatY]);
  const floatAnim = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AppHeader title={t("orders.title")} showBack={showBack} />
      <ScrollView
        contentContainerStyle={[emptyS.container, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        <Animated.View style={[emptyS.illusWrap, floatAnim]}>
          <LinearGradient colors={EMPTY_GRAD} style={emptyS.illusBg}>
            <View style={emptyS.illusRing}>
              <Ionicons name="bag-handle-outline" size={64} color={theme.colors.teal[500]} />
            </View>
            <View style={emptyS.illusBadge}>
              <Ionicons name="add" size={14} color={theme.colors.surface} />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(80)} style={emptyS.textBlock}>
          <UIText variant="sheet-title" align="center" style={emptyS.headline}>
            {t("orders.emptyHeadline")}
          </UIText>
          <UIText variant="body-sm" color="secondary" align="center" style={emptyS.sub}>
            {t("orders.emptyDescription")}
          </UIText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(160)}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web")
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push("/(tabs)/products");
            }}
            style={emptyS.ctaWrap}>
            <LinearGradient
              colors={[theme.colors.teal[500], theme.colors.brand[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={emptyS.ctaGrad}>
              <Ionicons name="storefront-outline" size={18} color={theme.colors.surface} />
              <UIText style={emptyS.ctaText}>{t("common.shopNow")}</UIText>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(240)} style={emptyS.catsSection}>
          <UIText
            variant="eyebrow"
            color="tertiary"
            align="center"
            style={{ marginBottom: 14, letterSpacing: 0.4 }}>
            {t("search.categoriesTitle")}
          </UIText>
          <View style={emptyS.catRow}>
            {CAT_CHIPS.map((cat) => (
              <Pressable
                key={cat.labelKey}
                onPress={() => router.push("/(tabs)/products")}
                style={[emptyS.catChip, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={16} color={cat.color} />
                <UIText style={[emptyS.catLabel, { color: cat.color }]} numberOfLines={1}>
                  {t(cat.labelKey)}
                </UIText>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
