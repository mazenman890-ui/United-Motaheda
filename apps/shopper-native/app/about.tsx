import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { AppLogo } from "@/shared/components/AppLogo";
import { BranchAddressList } from "@/components/BranchAddressCard";
import { useAppLanguage } from "@/i18n/LanguageProvider";

const APP_VERSION = "1.0.0";
const APP_BUILD   = "100";

const STATS = [
  { valueKey: "about.stat1Value", labelKey: "about.stat1Label" },
  { valueKey: "about.stat2Value", labelKey: "about.stat2Label" },
  { valueKey: "about.stat3Value", labelKey: "about.stat3Label" },
] as const;

interface ContactRowProps {
  icon:    React.ComponentProps<typeof Ionicons>["name"];
  label:   string;
  value:   string;
  color:   string;
  onPress: () => void;
}

function ContactRow({ icon, label, value, color, onPress }: ContactRowProps) {
  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.75 }]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, flex: 1 }}>
        <View style={[styles.contactIcon, { backgroundColor: `${color}14` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ gap: 2 }}>
          <UIText style={styles.contactLabel}>{label}</UIText>
          <UIText style={styles.contactValue}>{value}</UIText>
        </View>
      </View>
      <Ionicons name="chevron-back" size={16} color={theme.colors.text.tertiary} />
    </Pressable>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <UIText style={styles.infoValue}>{value}</UIText>
      <UIText style={styles.infoLabel}>{label}</UIText>
    </View>
  );
}

export default function AboutScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { t }    = useTranslation();
  const { language } = useAppLanguage();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.text.primary} />
        </Pressable>
        <UIText style={styles.title}>{t("about.title")}</UIText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Brand hero */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={theme.gradients.heroPrimary as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandHero}>
            <View style={styles.logoTile}>
              <AppLogo size="lg" />
            </View>
            <UIText style={styles.heroTagline}>{t("about.tagline")}</UIText>
            <View style={styles.versionBadge}>
              <UIText style={styles.versionText}>{t("profile.version", { ver: APP_VERSION })}</UIText>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.duration(350).delay(80)} style={styles.section}>
          <UIText style={styles.sectionTitle}>{t("about.whoWeAreTitle")}</UIText>
          <View style={styles.card}>
            <UIText style={styles.description}>
              {t("about.whoWeArePara1")}{"\n\n"}{t("about.whoWeArePara2")}
            </UIText>
          </View>
        </Animated.View>

        {/* App stats */}
        <Animated.View entering={FadeInDown.duration(350).delay(140)} style={styles.section}>
          <UIText style={styles.sectionTitle}>{t("about.statsTitle")}</UIText>
          <View style={styles.statsRow}>
            {STATS.map((stat) => (
              <View key={stat.labelKey} style={styles.statCard}>
                <UIText style={styles.statValue}>{t(stat.valueKey)}</UIText>
                <UIText style={styles.statLabel}>{t(stat.labelKey)}</UIText>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Branch locations */}
        <Animated.View entering={FadeInDown.duration(350).delay(170)} style={styles.section}>
          <UIText style={styles.sectionTitle}>{t("about.branchesTitle")}</UIText>
          <BranchAddressList />
        </Animated.View>

        {/* Contact */}
        <Animated.View entering={FadeInDown.duration(350).delay(200)} style={styles.section}>
          <UIText style={styles.sectionTitle}>{t("about.contact")}</UIText>
          <View style={styles.card}>
            <ContactRow
              icon="logo-whatsapp"
              label={t("about.whatsappLabel")}
              value="+20 111 234 3212"
              color="#25D366"
              onPress={() => Linking.openURL("https://wa.me/201112343212?text=مرحباً").catch(() => {})}
            />
            <View style={styles.rowDivider} />
            <ContactRow
              icon="call-outline"
              label={t("about.phoneLabel")}
              value="+20 111 234 3212"
              color={theme.colors.brand[600]}
              onPress={() => Linking.openURL("tel:+201112343212").catch(() => {})}
            />
            <View style={styles.rowDivider} />
            <ContactRow
              icon="mail-outline"
              label={t("about.emailLabel")}
              value="info@unitedpharmacy.com"
              color={theme.colors.info.strong}
              onPress={() => Linking.openURL("mailto:info@unitedpharmacy.com").catch(() => {})}
            />
          </View>
        </Animated.View>

        {/* App info */}
        <Animated.View entering={FadeInDown.duration(350).delay(260)} style={styles.section}>
          <UIText style={styles.sectionTitle}>{t("about.appInfoTitle")}</UIText>
          <View style={styles.card}>
            <InfoRow label={t("about.versionLabel")} value={APP_VERSION} />
            <View style={styles.rowDivider} />
            <InfoRow label={t("about.buildLabel")} value={APP_BUILD} />
            <View style={styles.rowDivider} />
            <InfoRow
              label={t("about.osLabel")}
              value={Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"}
            />
            <View style={styles.rowDivider} />
            <InfoRow
              label={t("language.label")}
              value={language === "en" ? t("language.en") : t("language.ar")}
            />
          </View>
        </Animated.View>

        <UIText style={styles.copyright}>{t("about.copyright")}</UIText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: theme.colors.bg },
  header:       { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.layout.pagePaddingH, paddingVertical: 14, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border.default, ...theme.shadow.xs },
  backBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.subtle, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border.default },
  title:        { fontSize: theme.fontSize["2xl"], fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  content:      { gap: 0 },
  brandHero:    { alignItems: "center", gap: 14, paddingVertical: 36, paddingHorizontal: theme.layout.pagePaddingH },
  logoTile:     { width: 116, height: 116, borderRadius: 26, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...theme.shadow.lg },
  heroTagline:  { fontSize: theme.fontSize.base, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.65)", textAlign: "center" },
  versionBadge: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 99, paddingHorizontal: 16, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  versionText:  { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.85)" },
  section:      { paddingHorizontal: theme.layout.pagePaddingH, paddingTop: 20, gap: 8 },
  sectionTitle: { fontSize: theme.fontSize.xs, fontFamily: theme.fonts.extrabold, color: theme.colors.text.tertiary, letterSpacing: 0.8, textAlign: "right" },
  card:         { backgroundColor: theme.colors.surface, borderRadius: theme.layout.cardRadius, overflow: "hidden", ...theme.shadow.xs, borderWidth: 1, borderColor: theme.colors.border.default },
  description:  { fontSize: theme.fontSize.base, fontFamily: theme.fonts.regular, color: theme.colors.text.secondary, textAlign: "right", lineHeight: 24, padding: 16 },
  statsRow:     { flexDirection: "row-reverse", gap: 10 },
  statCard:     { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: 16, alignItems: "center", gap: 4, ...theme.shadow.xs, borderWidth: 1, borderColor: theme.colors.border.default },
  statValue:    { fontSize: theme.fontSize["2xl"], fontFamily: theme.fonts.black, color: theme.colors.brand[700] },
  statLabel:    { fontSize: theme.fontSize.xs, fontFamily: theme.fonts.semibold, color: theme.colors.text.tertiary, textAlign: "center" },
  contactRow:   { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  contactIcon:  { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: theme.fontSize.xs, fontFamily: theme.fonts.semibold, color: theme.colors.text.tertiary, textAlign: "right" },
  contactValue: { fontSize: theme.fontSize.base, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: "right" },
  infoRow:      { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13 },
  infoLabel:    { fontSize: theme.fontSize.base, fontFamily: theme.fonts.semibold, color: theme.colors.text.secondary, textAlign: "right" },
  infoValue:    { fontSize: theme.fontSize.base, fontFamily: theme.fonts.bold, color: theme.colors.text.primary },
  rowDivider:   { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border.default, marginHorizontal: 16 },
  copyright:    { fontSize: 11, color: theme.colors.text.disabled, textAlign: "center", paddingTop: 28, paddingBottom: 8 },
});
