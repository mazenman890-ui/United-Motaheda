/**
 * AddRxEntry — entry-point screen for adding a new prescription.
 *
 * Spec: HANDOFF.md §9.3 (organisms) → screens-rx.jsx > AddRxEntry.
 *
 * Four options stacked vertically:
 *   1. Scan the label (camera)        → /prescriptions/scan
 *   2. Transfer from another pharmacy → /prescriptions/transfer
 *   3. Enter the Rx number manually   → /prescriptions/manual
 *   4. Ask your doctor to send it     → "قريباً" alert (no route yet)
 *
 * Closes with a bottom info callout about controlled substances
 * (DEA Schedule II — must be in-person, e-prescription only).
 */

import React, { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { showSuccessSheet } from "@/shared/store/appSheetStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Direct import (not the barrel) to break a require cycle:
// shared/components/index → PharmacyBootstrap → features/prescriptions → here.
import { AppHeader } from "@/shared/components/AppHeader";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface EntryOption {
  icon:        IoniconsName;
  tint:        string;
  bg:          string;
  title:       string;
  description: string;
  onPress:     () => void;
}

function EntryCard({ option }: { option: EntryOption }): React.ReactElement {
  return (
    <Pressable
      onPress={option.onPress}
      accessibilityRole="button"
      accessibilityLabel={option.title}
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: option.bg }]}>
        <Ionicons name={option.icon} size={22} color={option.tint} />
      </View>
      <View style={styles.cardBody}>
        <Text variant="card-title" align="right" numberOfLines={1}>
          {option.title}
        </Text>
        <Text variant="caption" color="secondary" align="right" style={{ marginTop: 2 }}>
          {option.description}
        </Text>
      </View>
      <Ionicons
        name="chevron-back"
        size={18}
        color={theme.colors.text.tertiary}
      />
    </Pressable>
  );
}

export function AddRxEntry(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const showComingSoon = useCallback((title: string) => {
    showSuccessSheet(title, "هذه الميزة قادمة قريباً. ترقّب التحديثات!");
  }, []);

  const options: EntryOption[] = [
    {
      icon:        "scan-outline",
      tint:        theme.colors.brand.base,
      bg:          theme.colors.brand.lighter,
      title:       "مسح ملصق الوصفة",
      description: "استخدم الكاميرا — الأسرع إذا كانت الزجاجة بيدك",
      onPress:     () => router.push("/prescriptions/scan" as never),
    },
    {
      icon:        "swap-horizontal-outline",
      tint:        "#7C3AED",
      bg:          theme.colors.purple[50],
      title:       "نقل من صيدلية أخرى",
      description: "نتولى المكالمة. عادةً جاهز خلال 4 ساعات",
      onPress:     () => router.push("/prescriptions/transfer" as never),
    },
    {
      icon:        "keypad-outline",
      tint:        theme.colors.warning.base,
      bg:          theme.colors.warning.bg,
      title:       "إدخال رقم الوصفة",
      description: "اكتبه يدوياً من ورقة الوصفة أو الملصق",
      onPress:     () => router.push("/prescriptions/manual" as never),
    },
    {
      icon:        "mail-outline",
      tint:        theme.colors.info.base,
      bg:          theme.colors.info.bg,
      title:       "اطلب من طبيبك إرسالها إلكترونياً",
      description: "سنشاركك نموذجاً قابلاً للطباعة لمزوّد الرعاية",
      onPress:     () => showComingSoon("اطلب من طبيبك إرسالها إلكترونياً"),
    },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader title="إضافة وصفة" showBack />
      <ScrollView
        contentContainerStyle={{
          padding:       theme.layout.pagePaddingH,
          paddingBottom: insets.bottom + theme.spacing[3],
          gap:           theme.spacing[1.5],
        }}
        showsVerticalScrollIndicator={false}>

        <Text variant="caption" color="secondary" align="right">
          اختر الطريقة الأنسب لك الآن
        </Text>

        <View style={{ gap: theme.spacing[1.5], marginTop: theme.spacing[1] }}>
          {options.map((opt) => (
            <EntryCard key={opt.title} option={opt} />
          ))}
        </View>

        {/* Controlled-substance info callout */}
        <View style={styles.infoCallout}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={18} color={theme.colors.info.base} />
          </View>
          <Text variant="caption" align="right" style={{ flex: 1, color: theme.colors.info.text, lineHeight: 18 }}>
            المواد الخاضعة للرقابة (الجدول الثاني) تتطلب تسليماً شخصياً ونسخة إلكترونية من الطبيب. لا يمكن قبولها بصورة.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  card: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing[1.5],
    paddingHorizontal: theme.spacing[2],
    paddingVertical:   theme.spacing[2],
    backgroundColor:   theme.colors.surface,
    borderRadius:      theme.layout.cardRadius,
    borderWidth:       1,
    borderColor:       theme.colors.border.default,
    ...theme.shadow.card,
  },
  iconWrap: {
    width:           48,
    height:          48,
    borderRadius:    theme.radius.lg,
    alignItems:      "center",
    justifyContent:  "center",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  infoCallout: {
    flexDirection:     "row-reverse",
    alignItems:        "flex-start",
    gap:               theme.spacing[1],
    padding:           theme.spacing[1.5],
    marginTop:         theme.spacing[2],
    backgroundColor:   theme.colors.info.bg,
    borderRadius:      theme.layout.cardRadius,
    borderWidth:       1,
    borderColor:       theme.colors.info.light,
  },
  infoIcon: {
    marginTop: 1,
  },
});
