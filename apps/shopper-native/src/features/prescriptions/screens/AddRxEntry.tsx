/**
 * AddRxEntry — entry-point screen for adding a new prescription.
 *
 * Spec: HANDOFF.md §9.3 (organisms) → screens-rx.jsx > AddRxEntry.
 *
 * Options stacked vertically (working paths first):
 *   1. Send via WhatsApp              → wa.me link (live operational channel)
 *   2. Enter the Rx number manually   → /prescriptions/manual
 *   3. Scan the label (camera)        → /prescriptions/scan   (coming soon)
 *   4. Transfer from another pharmacy → /prescriptions/transfer (coming soon)
 *
 * History: a fifth "ask your doctor to e-send it" option was removed — no
 * backing flow existed, and its copy promised a printable form that was
 * never built. Descriptions for the coming-soon paths no longer promise
 * SLAs ("ready in 4 hours") that nothing delivers.
 */

import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Direct import (not the barrel) to break a require cycle:
// shared/components/index → PharmacyBootstrap → features/prescriptions → here.
import { AppHeader } from "@/shared/components/AppHeader";
import { Text } from "@/shared/ui";
import { flexRow, isRtl, FORWARD_CHEVRON } from "@/utils/layout";
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
        name={FORWARD_CHEVRON}
        size={18}
        color={theme.colors.text.tertiary}
      />
    </Pressable>
  );
}

const WHATSAPP_RX_URL =
  `https://wa.me/201112343212?text=${encodeURIComponent("مرحباً، أريد إضافة وصفة طبية إلى حسابي.")}`;

export function AddRxEntry(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const options: EntryOption[] = [
    {
      icon:        "logo-whatsapp",
      tint:        "#25D366",
      bg:          theme.colors.success.bg,
      title:       "إرسال الوصفة عبر واتساب",
      description: "أرسل صورة الوصفة وسيضيفها فريق الصيدلية إلى حسابك",
      onPress:     () => { void Linking.openURL(WHATSAPP_RX_URL).catch(() => {}); },
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
      icon:        "scan-outline",
      tint:        theme.colors.brand.base,
      bg:          theme.colors.brand.lighter,
      title:       "مسح ملصق الوصفة",
      description: "قريباً — مسح الوصفة بالكاميرا مباشرةً",
      onPress:     () => router.push("/prescriptions/scan" as never),
    },
    {
      icon:        "swap-horizontal-outline",
      tint:        "#7C3AED",
      bg:          theme.colors.purple[50],
      title:       "نقل من صيدلية أخرى",
      description: "قريباً — انقل وصفاتك من صيدلية أخرى بسهولة",
      onPress:     () => router.push("/prescriptions/transfer" as never),
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
            الأدوية الخاضعة للرقابة تتطلب وصفة طبية ورقية أصلية تُسلَّم للصيدلية، وفقاً للوائح وزارة الصحة المصرية.
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
    flexDirection:     flexRow(isRtl()),
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
    flexDirection:     flexRow(isRtl()),
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
