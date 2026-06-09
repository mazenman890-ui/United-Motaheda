import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

interface SectionProps {
  title:    string;
  children: React.ReactNode;
  delay?:   number;
}

function Section({ title, children, delay = 0 }: SectionProps) {
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(delay)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionDot}>
          <Ionicons name="shield-checkmark-outline" size={12} color={theme.colors.brand[700]} />
        </View>
        <UIText style={styles.sectionTitle}>{title}</UIText>
      </View>
      <UIText style={styles.sectionBody}>{children}</UIText>
    </Animated.View>
  );
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.text.primary} />
        </Pressable>
        <UIText style={styles.title}>{t("privacy.title")}</UIText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Last updated */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.updatedBanner}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.brand[700]} />
          <UIText style={styles.updatedText}>{t("privacy.lastUpdated")}</UIText>
        </Animated.View>

        {/* Intro */}
        <Animated.View entering={FadeInDown.duration(350).delay(40)} style={styles.introBanner}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.brand[600]} />
          <UIText style={styles.introText}>
            {t("privacy.introBanner")}
          </UIText>
        </Animated.View>

        <Section title="١. المعلومات التي نجمعها" delay={80}>
          {`نجمع المعلومات التي تقدمها مباشرةً عند إنشاء حسابك أو تقديم طلب، وتشمل:
• الاسم الكامل وعنوان البريد الإلكتروني
• رقم الهاتف وعنوان التوصيل
• سجل الطلبات والمنتجات المفضلة

كما نجمع بيانات الاستخدام التلقائية مثل نوع الجهاز ونظام التشغيل والصفحات التي تزورها داخل التطبيق، وذلك لتحسين تجربتك.`}
        </Section>

        <Section title="٢. كيف نستخدم بياناتك" delay={120}>
          {`نستخدم معلوماتك للأغراض التالية:
• تنفيذ طلباتك وتتبع الشحنات والتواصل معك بشأنها
• تخصيص عروض المنتجات وتوصياتها وفق اهتماماتك
• إرسال إشعارات هامة تتعلق بطلباتك وحسابك
• تحسين خدماتنا وتطوير ميزات التطبيق
• الامتثال للمتطلبات القانونية والتنظيمية

لن نستخدم بياناتك لأغراض تسويقية دون موافقتك الصريحة.`}
        </Section>

        <Section title="٣. مشاركة البيانات مع الأطراف الثالثة" delay={160}>
          {`لا نبيع معلوماتك الشخصية لأطراف ثالثة. قد نشارك بياناتك بشكل محدود في الحالات الآتية:
• شركات الشحن والتوصيل لتنفيذ طلباتك
• مزودو خدمة الدفع الإلكتروني لمعالجة المعاملات المالية بأمان
• الجهات الحكومية والتنظيمية عند الاقتضاء القانوني

نلزم جميع شركاءنا بسياسات خصوصية صارمة وعدم إعادة استخدام بياناتك.`}
        </Section>

        <Section title="٤. أمان البيانات" delay={200}>
          {`نطبّق معايير أمان متقدمة لحماية بياناتك، تشمل:
• تشفير SSL/TLS لجميع البيانات المنقولة
• تشفير كلمات المرور باستخدام خوارزميات bcrypt
• مراجعات أمنية دورية لقاعدة البيانات والبنية التحتية
• التحقق الثنائي للعمليات الحساسة

رغم جهودنا الكاملة، لا يمكن ضمان أمان مطلق عبر الإنترنت، وننصحك بالحفاظ على سرية كلمة مرورك.`}
        </Section>

        <Section title="٥. ملفات التعريف (Cookies)" delay={240}>
          {`يستخدم التطبيق تقنيات تخزين محلية مشابهة للـ Cookies لحفظ:
• بيانات جلسة تسجيل الدخول
• محتويات سلة التسوق
• التفضيلات الشخصية مثل اللغة والمنطقة

هذه البيانات تُخزَّن على جهازك فقط ولا تُرسَل إلى أطراف ثالثة.`}
        </Section>

        <Section title="٦. حقوقك" delay={280}>
          {`يحق لك في أي وقت:
• الاطلاع على بياناتك الشخصية المحفوظة لدينا
• تصحيح أي معلومات غير دقيقة
• طلب حذف حسابك وجميع بياناتك
• إلغاء الاشتراك في الرسائل التسويقية
• الاعتراض على معالجة بياناتك لأغراض معينة

للتواصل حول هذه الحقوق: info@unitedpharmacy.com`}
        </Section>

        <Section title="٧. الاحتفاظ بالبيانات" delay={320}>
          {`نحتفظ ببياناتك طالما كان حسابك نشطاً أو لفترة ضرورية لتقديم خدماتنا. عند حذف حسابك، تُحذف بياناتك الشخصية خلال ٣٠ يوماً، باستثناء ما يُلزمنا القانون بالاحتفاظ به لأغراض ضريبية أو تنظيمية.`}
        </Section>

        <Section title="٨. تعديلات السياسة" delay={360}>
          {`نحتفظ بحق تعديل هذه السياسة في أي وقت. سنُعلمك بأي تغييرات جوهرية عبر إشعار داخل التطبيق أو البريد الإلكتروني قبل نفاذ التعديل بـ ٧ أيام على الأقل. استمرار استخدامك للتطبيق بعد التعديل يُعدّ قبولاً منك للسياسة المحدّثة.`}
        </Section>

        <UIText style={styles.footer}>
          الصيدلية المتحدة • مصر • info@unitedpharmacy.com
        </UIText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: theme.colors.bg },
  header:        { flexDirection: flexRow(isRtl()), alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.layout.pagePaddingH, paddingVertical: 14, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border.default, ...theme.shadow.xs },
  backBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.subtle, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border.default },
  title:         { fontSize: theme.fontSize["2xl"], fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  content:       { padding: theme.layout.pagePaddingH, gap: 0 },
  updatedBanner: { flexDirection: flexRow(isRtl()), alignItems: "center", justifyContent: isRtl() ? "flex-start" : "flex-end", gap: 6, marginBottom: 14 },
  updatedText:   { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.semibold, color: theme.colors.brand[700] },
  introBanner:   { flexDirection: flexRow(isRtl()), alignItems: "flex-start", gap: 10, backgroundColor: theme.colors.brand[50], borderRadius: theme.radius.xl, padding: 16, borderWidth: 1, borderColor: theme.colors.brand[100], marginBottom: 20 },
  introText:     { flex: 1, fontSize: theme.fontSize.base, fontFamily: theme.fonts.semibold, color: theme.colors.text.primary, textAlign: textAlignStart(isRtl()), lineHeight: 22 },
  section:       { marginBottom: 28 },
  sectionHeader: {
    flexDirection: flexRow(isRtl()),
    alignItems:        "center",
    gap:               10,
    marginBottom:      12,
    paddingBottom:     10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  sectionDot: {
    width:           26,
    height:          26,
    borderRadius:    8,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  sectionTitle: {
    fontSize:      17,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.text.primary,
    flex:          1,
    textAlign: textAlignStart(isRtl()),
    letterSpacing: -0.3,
  },
  sectionBody: {
    fontSize:   theme.fontSize.base,
    fontFamily: theme.fonts.regular,
    color:      theme.colors.text.secondary,
    textAlign: textAlignStart(isRtl()),
    lineHeight: 28,
  },
  footer: { fontSize: 11, color: theme.colors.text.disabled, textAlign: "center", paddingTop: 16 },
});
