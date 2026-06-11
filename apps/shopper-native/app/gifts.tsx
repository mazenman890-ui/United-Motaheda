/**
 * Gifts route — wraps the feature-module GiftCatalogScreen.
 *
 * A dedicated ErrorBoundary with a branded fallback localises any render crash
 * here instead of letting it bubble to the root boundary's bare grey screen.
 * The fallback offers Retry (remounts the screen) and Back, so a transient data
 * issue is recoverable in-place. (Root-cause hardening + the full redesign
 * land in the Gifts rebuild.)
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text as UIText } from "@/shared/ui";
import { ErrorBoundary } from "@/shared/components";
import { theme } from "@/shared/theme";
import { flexRow, isRtl } from "@/utils/layout";
import { GiftCatalogScreen } from "@/features/loyalty";

function GiftsFallback({ reset }: { reset: () => void }) {
  const router = useRouter();
  const { t }  = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name="gift-outline" size={34} color={theme.colors.brand[600]} />
        </View>
        <UIText style={styles.title} maxFontSizeMultiplier={1.3}>
          {t("loyalty.giftCatalogErrorTitle")}
        </UIText>
        <UIText style={styles.body} maxFontSizeMultiplier={1.4}>
          {t("loyalty.giftCatalogErrorBody")}
        </UIText>

        <Pressable
          onPress={reset}
          accessibilityRole="button"
          accessibilityLabel={t("common.retry")}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
          <Ionicons name="refresh" size={15} color="#fff" />
          <UIText style={styles.primaryBtnText}>{t("common.retry")}</UIText>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={8}
          style={styles.ghostBtn}>
          <UIText style={styles.ghostBtnText}>{t("common.back")}</UIText>
        </Pressable>
      </View>
    </View>
  );
}

export default function GiftsRoute() {
  return (
    <ErrorBoundary surface="gifts" fallback={(reset) => <GiftsFallback reset={reset} />}>
      <GiftCatalogScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.brand.lighter,
    borderWidth: 1, borderColor: theme.colors.border.brandSoft,
    marginBottom: 4,
  },
  title: {
    fontFamily: theme.fonts.black, fontSize: 17,
    color: theme.colors.text.primary, textAlign: "center",
  },
  body: {
    fontFamily: theme.fonts.regular, fontSize: 13,
    color: theme.colors.text.secondary, textAlign: "center",
    lineHeight: 20, maxWidth: 300,
  },
  primaryBtn: {
    flexDirection: flexRow(isRtl()),
    alignItems: "center", gap: 8,
    backgroundColor: theme.colors.brand[600],
    borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13,
    marginTop: 8,
  },
  primaryBtnText: { fontFamily: theme.fonts.black, fontSize: 13, color: "#fff" },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 16, marginTop: 2 },
  ghostBtnText: { fontFamily: theme.fonts.bold, fontSize: 13, color: theme.colors.text.tertiary },
});
