import React from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";

const APP_VERSION = "1.0.0";
const APP_BUILD   = "100";

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
      style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.75 }]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, flex: 1 }}>
        <View style={[styles.contactIcon, { backgroundColor: `${color}14` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ gap: 2 }}>
          <Text style={styles.contactLabel}>{label}</Text>
          <Text style={styles.contactValue}>{value}</Text>
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
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>عن التطبيق</Text>
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
            <View style={styles.logoCard}>
              <Image
                source={require("../assets/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTagline}>صيدليتك الموثوقة — في متناول يدك</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>الإصدار {APP_VERSION}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.duration(350).delay(80)} style={styles.section}>
          <Text style={styles.sectionTitle}>من نحن</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              الصيدلية المتحدة هي منصة صيدلانية رقمية متكاملة تتيح لك الوصول إلى مئات المنتجات الدوائية
              ومستلزمات العناية الصحية بأسعار تنافسية، مع توصيل سريع وآمن إلى باب منزلك.{"\n\n"}
              نؤمن بأن الحصول على الدواء حق لكل إنسان، لذا نسعى دائماً لتقديم أفضل تجربة تسوق صيدلاني
              بمعايير الجودة والأمان العالية.
            </Text>
          </View>
        </Animated.View>

        {/* App stats */}
        <Animated.View entering={FadeInDown.duration(350).delay(140)} style={styles.section}>
          <Text style={styles.sectionTitle}>أرقامنا</Text>
          <View style={styles.statsRow}>
            {[
              { value: "+٥٠٠", label: "منتج طبي" },
              { value: "+٢٠",  label: "تصنيف" },
              { value: "٢٤/٧", label: "خدمة العملاء" },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Contact */}
        <Animated.View entering={FadeInDown.duration(350).delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>تواصل معنا</Text>
          <View style={styles.card}>
            <ContactRow
              icon="logo-whatsapp"
              label="واتساب"
              value="+20 111 234 3212"
              color="#25D366"
              onPress={() => Linking.openURL("https://wa.me/201112343212?text=مرحباً").catch(() => {})}
            />
            <View style={styles.rowDivider} />
            <ContactRow
              icon="call-outline"
              label="هاتف"
              value="+20 111 234 3212"
              color={theme.colors.brand[600]}
              onPress={() => Linking.openURL("tel:+201112343212").catch(() => {})}
            />
            <View style={styles.rowDivider} />
            <ContactRow
              icon="mail-outline"
              label="البريد الإلكتروني"
              value="info@unitedpharmacy.com"
              color={theme.colors.info.strong}
              onPress={() => Linking.openURL("mailto:info@unitedpharmacy.com").catch(() => {})}
            />
          </View>
        </Animated.View>

        {/* App info */}
        <Animated.View entering={FadeInDown.duration(350).delay(260)} style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات التطبيق</Text>
          <View style={styles.card}>
            <InfoRow label="رقم الإصدار"     value={APP_VERSION} />
            <View style={styles.rowDivider} />
            <InfoRow label="رقم البناء"        value={APP_BUILD} />
            <View style={styles.rowDivider} />
            <InfoRow label="نظام التشغيل"      value={Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"} />
            <View style={styles.rowDivider} />
            <InfoRow label="اللغة"             value="العربية" />
          </View>
        </Animated.View>

        <Text style={styles.copyright}>
          © 2025 الصيدلية المتحدة. جميع الحقوق محفوظة.
        </Text>
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
  logoCard:     { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 14, ...theme.shadow.lg },
  logo:         { width: 200, height: 72 },
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
