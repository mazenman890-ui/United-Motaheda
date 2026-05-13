import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/stores/cart";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

type Step = "details" | "review" | "success";

export default function CheckoutScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const items     = useCartStore((s) => s.items);
  const subtotal  = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep]       = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", city: "", street: "", building: "", floor: "", notes: "",
  });

  const delivery = subtotal >= 200 ? 0 : 15;
  const total    = subtotal + delivery;

  const update = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearCart();
    setStep("success");
    setLoading(false);
  };

  if (step === "success") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center", padding: 32, gap: 0 }}>
        <LinearGradient
          colors={["#065f46", "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 110, height: 110, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 24, ...theme.shadow.brand }}>
          <Ionicons name="checkmark" size={52} color="#fff" />
        </LinearGradient>

        <Text style={{ fontSize: 24, fontWeight: "900", color: theme.colors.slate[900], textAlign: "center", marginBottom: 12 }}>
          تم تأكيد طلبك!
        </Text>
        <Text style={{ fontSize: 14, color: theme.colors.slate[500], textAlign: "center", lineHeight: 22, paddingHorizontal: 16, marginBottom: 32 }}>
          سيتم التواصل معك خلال 30 دقيقة لتأكيد التوصيل.{"\n"}شكراً لثقتك في صيدلية United Motaheda 💚
        </Text>

        <View style={{ backgroundColor: "#fff", borderRadius: theme.radius.xl, padding: 16, width: "100%", marginBottom: 28, borderWidth: 1, borderColor: theme.colors.slate[100], ...theme.shadow.sm }}>
          <SummaryRow label="الإجمالي المدفوع" value={formatPrice(total)} bold />
          <SummaryRow label="التوصيل" value={delivery === 0 ? "مجاني 🎉" : formatPrice(delivery)} />
          <SummaryRow label="عدد المنتجات" value={`${items.length} منتج`} />
        </View>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.replace("/(tabs)/")}>
          العودة للرئيسية 🏠
        </Button>
      </View>
    );
  }

  const canProceed = form.name.trim() && form.phone.trim() && form.city.trim() && form.street.trim();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>

        {/* Header */}
        <View style={{
          paddingTop:        insets.top + 14,
          paddingHorizontal: 16,
          paddingBottom:     14,
          backgroundColor:   "#fff",
          flexDirection:     "row-reverse",
          alignItems:        "center",
          gap:               12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.slate[100],
          ...theme.shadow.sm,
        }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.slate[50], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.slate[200] }}>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.slate[600]} />
            </View>
          </Pressable>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: "900", color: theme.colors.slate[900], textAlign: "right" }}>
            إتمام الطلب
          </Text>
          {/* Step indicators */}
          <View style={{ flexDirection: "row", gap: 0, alignItems: "center" }}>
            <StepDot num={1} active={step === "details"} done={step === "review"} />
            <View style={{ width: 20, height: 2, backgroundColor: step === "review" ? theme.colors.brand[500] : theme.colors.slate[200] }} />
            <StepDot num={2} active={step === "review"} done={false} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 + insets.bottom }}>
          {step === "details" ? (
            <>
              <SectionCard title="بيانات التوصيل" iconName="location-outline">
                <Input label="الاسم الكامل *"    value={form.name}     onChangeText={update("name")}     placeholder="محمد أحمد" />
                <Input label="رقم الهاتف *"      value={form.phone}    onChangeText={update("phone")}    placeholder="01xxxxxxxxx" keyboardType="phone-pad" />
                <Input label="المحافظة *"         value={form.city}     onChangeText={update("city")}     placeholder="القاهرة" />
                <Input label="الشارع *"           value={form.street}   onChangeText={update("street")}   placeholder="اسم الشارع والمنطقة" />
                <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input label="رقم المبنى" value={form.building} onChangeText={update("building")} placeholder="١٠" keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="الطابق"     value={form.floor}    onChangeText={update("floor")}    placeholder="٣"  keyboardType="number-pad" />
                  </View>
                </View>
                <Input label="ملاحظات للسائق (اختياري)" value={form.notes} onChangeText={update("notes")} placeholder="أي تعليمات إضافية للتوصيل…" multiline numberOfLines={3} />
              </SectionCard>

              {/* Delivery info strip */}
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                {([
                  { iconName: "flash-outline" as const,   label: "توصيل خلال 24 ساعة" },
                  { iconName: "wallet-outline" as const,  label: "دفع عند الاستلام" },
                ] as { iconName: React.ComponentProps<typeof Ionicons>["name"]; label: string }[]).map((b) => (
                  <View key={b.label} style={{ flex: 1, backgroundColor: theme.colors.brand[50], borderRadius: theme.radius.lg, padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 6, borderWidth: 1, borderColor: theme.colors.brand[100] }}>
                    <Ionicons name={b.iconName} size={17} color={theme.colors.brand[600]} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.brand[700] }}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              {/* Order items */}
              <SectionCard title="مراجعة الطلب" iconName="cart-outline">
                {items.map((item) => (
                  <View key={item.productId} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.slate[100] }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.slate[800], flex: 1, textAlign: "right", lineHeight: 18 }} numberOfLines={2}>
                      {item.product.nameAr ?? item.product.name}
                      <Text style={{ color: theme.colors.slate[400], fontWeight: "600" }}> × {item.quantity}</Text>
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.amber[600], marginRight: 12 }}>
                      {formatPrice(item.product.price * item.quantity)}
                    </Text>
                  </View>
                ))}
                <View style={{ gap: 8, marginTop: 8 }}>
                  <SummaryRow label="المجموع الجزئي" value={formatPrice(subtotal)} />
                  <SummaryRow label="التوصيل" value={delivery === 0 ? "مجاني 🎉" : formatPrice(delivery)} />
                  <View style={{ height: 1.5, backgroundColor: theme.colors.slate[100], marginVertical: 2 }} />
                  <SummaryRow label="الإجمالي" value={formatPrice(total)} bold />
                </View>
              </SectionCard>

              {/* Address summary */}
              <SectionCard title="عنوان التوصيل" iconName="location-outline">
                <View style={{ backgroundColor: theme.colors.slate[50], borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.colors.slate[100] }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.slate[900], textAlign: "right", marginBottom: 4 }}>{form.name}</Text>
                  <Text style={{ fontSize: 13, color: theme.colors.slate[600], textAlign: "right", lineHeight: 20 }}>
                    {form.phone}{"\n"}{form.street}، مبنى {form.building}{form.floor ? `، ط ${form.floor}` : ""}{"\n"}{form.city}
                  </Text>
                </View>
                <Pressable onPress={() => setStep("details")}>
                  <Text style={{ fontSize: 12, color: theme.colors.brand[600], fontWeight: "700", textAlign: "right" }}>تعديل العنوان ←</Text>
                </Pressable>
              </SectionCard>
            </>
          )}
        </ScrollView>

        {/* CTA */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", padding: 16, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: theme.colors.slate[100], ...theme.shadow.lg }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={step === "details" && !canProceed}
            onPress={step === "details" ? () => setStep("review") : handleConfirm}>
            {step === "details"
              ? "مراجعة الطلب  ←"
              : `تأكيد الطلب  —  ${formatPrice(total)}`}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function StepDot({ num, active, done }: { num: number; active: boolean; done: boolean }) {
  const filled = active || done;
  return (
    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: filled ? theme.colors.brand[600] : theme.colors.slate[100], alignItems: "center", justifyContent: "center", borderWidth: filled ? 0 : 1, borderColor: theme.colors.slate[200] }}>
      <Text style={{ color: filled ? "#fff" : theme.colors.slate[400], fontSize: 11, fontWeight: "900" }}>
        {done ? "✓" : num}
      </Text>
    </View>
  );
}

function SectionCard({ title, iconName, children }: { title: string; iconName: React.ComponentProps<typeof Ionicons>["name"]; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: theme.radius.xl, padding: 16, gap: 12, borderWidth: 1, borderColor: theme.colors.slate[100], ...theme.shadow.sm }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <Ionicons name={iconName} size={17} color={theme.colors.brand[600]} />
        <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.slate[800] }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 13, color: bold ? theme.colors.slate[900] : theme.colors.slate[500], fontWeight: bold ? "800" : "500" }}>{label}</Text>
      <Text style={{ fontSize: 13, color: bold ? theme.colors.amber[600] : theme.colors.slate[800], fontWeight: bold ? "900" : "700" }}>{value}</Text>
    </View>
  );
}
