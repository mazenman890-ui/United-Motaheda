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
          <Ionicons name="document-text-outline" size={12} color={theme.colors.brand[700]} />
        </View>
        <UIText style={styles.sectionTitle}>{title}</UIText>
      </View>
      <UIText style={styles.sectionBody}>{children}</UIText>
    </Animated.View>
  );
}

export default function TermsScreen() {
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
        <UIText style={styles.title}>{t("terms.title")}</UIText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Last updated */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.updatedBanner}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.brand[700]} />
          <UIText style={styles.updatedText}>{t("terms.lastUpdated")}</UIText>
        </Animated.View>

        {/* Warning banner */}
        <Animated.View entering={FadeInDown.duration(350).delay(40)} style={styles.warningBanner}>
          <Ionicons name="document-text" size={20} color={theme.colors.warning.strong} />
          <UIText style={styles.warningText}>
            {t("terms.agreeBanner")}
          </UIText>
        </Animated.View>

        <Section title="١. قبول الشروط" delay={80}>
          {`باستخدامك لتطبيق الصيدلية المتحدة أو خدماتها، تؤكد موافقتك الكاملة على هذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، فيرجى عدم استخدام التطبيق.

تسري هذه الشروط على جميع المستخدمين بما فيهم الزوار وأصحاب الحسابات، وتُقرأ جنباً إلى جنب مع سياسة الخصوصية.`}
        </Section>

        <Section title="٢. التسجيل والحساب" delay={120}>
          {`• يجب أن يكون عمرك ١٨ عاماً أو أكثر للتسجيل
• أنت مسؤول عن الحفاظ على سرية بيانات حسابك
• يجب إخطارنا فوراً عند الاشتباه في اختراق حسابك
• لا يحق لك إنشاء أكثر من حساب واحد
• نحتفظ بحق تعليق أو إلغاء أي حساب يُخالف هذه الشروط`}
        </Section>

        <Section title="٣. الطلبات والمنتجات" delay={160}>
          {`• جميع الأسعار المعروضة بالجنيه المصري وتشمل ضريبة القيمة المضافة
• تتوقف الأسعار على حالة المخزون وقد تتغير دون إشعار مسبق
• تأكيد الطلب مشروط بتوفر المنتج وصحة بيانات التوصيل
• لا تتوفر في التطبيق أدوية تستلزم وصفة طبية إلا من خلال القنوات الرسمية
• نحتفظ بحق رفض أي طلب أو إلغائه في حالات استثنائية مع استرداد كامل للمبلغ`}
        </Section>

        <Section title="٤. التوصيل والشحن" delay={200}>
          {`• رسوم التوصيل ٢٥ جنيهاً مصرياً لجميع الطلبات
• مواعيد التوصيل تقديرية وقد تتأثر بالظروف الخارجة عن إرادتنا
• يتحمل العميل مسؤولية صحة عنوان التوصيل المُدخَل
• عند غياب العميل وقت التوصيل، يُعاد التواصل معه لترتيب موعد بديل
• نتحمل المسؤولية الكاملة عن أي تلف يحدث للمنتجات أثناء الشحن`}
        </Section>

        <Section title="٥. الإرجاع والاسترداد" delay={240}>
          {`• يحق لك إرجاع المنتجات غير المفتوحة خلال ٧ أيام من الاستلام
• لا يُقبل إرجاع الأدوية والمستحضرات الصيدلانية المفتوحة لأسباب صحية وسلامة
• يُستثنى من الإرجاع المنتجات المبرّدة والعروض الخاصة ما لم تكن معيبة
• يتم رد المبلغ خلال ٥-٧ أيام عمل بنفس وسيلة الدفع الأصلية
• للتواصل بشأن الإرجاع: info@unitedpharmacy.com`}
        </Section>

        <Section title="٦. الملكية الفكرية" delay={280}>
          {`جميع محتويات التطبيق من شعارات وصور ونصوص وتصاميم هي ملكية حصرية للصيدلية المتحدة محمية بموجب قوانين حقوق النشر والملكية الفكرية. يُحظر نسخ أي محتوى أو إعادة توزيعه أو استخدامه تجارياً دون إذن كتابي مسبق.`}
        </Section>

        <Section title="٧. حدود المسؤولية" delay={320}>
          {`لن تكون الصيدلية المتحدة مسؤولة عن:
• أي أضرار غير مباشرة أو تبعية ناجمة عن استخدام التطبيق
• توقف الخدمة بسبب ظروف قاهرة أو صيانة مجدولة
• أخطاء المستخدم في إدخال بيانات الطلب أو العنوان
• استخدام الأدوية بشكل مخالف للتعليمات الطبية`}
        </Section>

        <Section title="٨. تعديل الشروط" delay={360}>
          {`نحتفظ بحق تعديل هذه الشروط في أي وقت. سنُعلمك بأي تغييرات جوهرية عبر إشعار داخل التطبيق قبل نفاذها. استمرار استخدامك للتطبيق بعد التعديل يُعدّ قبولاً منك للشروط المحدّثة.`}
        </Section>

        <Section title="٩. القانون المنطبق" delay={400}>
          {`تخضع هذه الشروط وتُفسَّر وفقاً لأحكام القانون المصري. أي نزاع ينشأ عن هذه الشروط يُحال للمحاكم المختصة في جمهورية مصر العربية.`}
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
  updatedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6, marginBottom: 14 },
  updatedText:   { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.semibold, color: theme.colors.brand[700] },
  warningBanner: { flexDirection: flexRow(isRtl()), alignItems: "flex-start", gap: 10, backgroundColor: theme.colors.warning.bg, borderRadius: theme.radius.xl, padding: 16, borderWidth: 1, borderColor: theme.colors.warning.light, marginBottom: 20 },
  warningText:   { flex: 1, fontSize: theme.fontSize.base, fontFamily: theme.fonts.semibold, color: theme.colors.text.primary, textAlign: textAlignStart(isRtl()), lineHeight: 22 },
  section:       { marginBottom: 28 },
  sectionHeader: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           10,
    marginBottom:  12,
    paddingBottom: 10,
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
  // Bold, large section heading — editorial hierarchy
  sectionTitle: {
    fontSize:      17,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.text.primary,
    flex:          1,
    textAlign: textAlignStart(isRtl()),
    letterSpacing: -0.3,
  },
  // Body text: generous line-height, no card box, clean reading flow
  sectionBody: {
    fontSize:   theme.fontSize.base,
    fontFamily: theme.fonts.regular,
    color:      theme.colors.text.secondary,
    textAlign: textAlignStart(isRtl()),
    lineHeight: 28,   // generous editorial rhythm
  },
  footer: { fontSize: 11, color: theme.colors.text.disabled, textAlign: "center", paddingTop: 16 },
});
