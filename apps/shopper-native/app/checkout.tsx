import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useCartStore } from "@/stores/cart";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

type Step = "details" | "review" | "success";

export default function CheckoutScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const items    = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep]   = useState<Step>("details");
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
      <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
        <Text style={{ fontSize: 80 }}>🎉</Text>
        <Text style={{ fontSize: 22, fontWeight: "900", color: theme.colors.slate[950], textAlign: "center" }}>
          تم تأكيد طلبك!
        </Text>
        <Text style={{ fontSize: 14, color: theme.colors.slate[500], textAlign: "center", lineHeight: 22 }}>
          سيتم التواصل معك خلال 30 دقيقة لتأكيد التوصيل.{"\n"}شكراً لثقتك في صيدلية United Motaheda 💚
        </Text>
        <Button
          variant="primary"
          size="lg"
          style={{ marginTop: 16 }}
          onPress={() => { router.dismissAll(); router.push("/(tabs)/"); }}>
          العودة للرئيسية 🏠
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: theme.colors.slate[50] }}>

        {/* Header */}
        <View style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: "#fff",
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.slate[100],
          ...theme.shadow.sm,
        }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={{ fontSize: 20, color: theme.colors.slate[600] }}>→</Text>
          </Pressable>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: "900", color: theme.colors.slate[950], textAlign: "right" }}>
            إتمام الطلب
          </Text>
          {/* Steps */}
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            {(["details", "review"] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <View style={{ width: 16, height: 1.5, backgroundColor: theme.colors.slate[300] }} />}
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: step === s || (step === "review" && i === 0) ? theme.colors.brand[600] : theme.colors.slate[200], alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: step === s || (step === "review" && i === 0) ? "#fff" : theme.colors.slate[500], fontSize: 11, fontWeight: "900" }}>{i + 1}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 + insets.bottom }}>
          {step === "details" ? (
            <>
              <SectionTitle title="بيانات التوصيل" />
              <FormCard>
                <Input label="الاسم الكامل *" value={form.name}     onChangeText={update("name")}     placeholder="محمد أحمد" />
                <Input label="رقم الهاتف *"   value={form.phone}    onChangeText={update("phone")}    placeholder="01xxxxxxxxx" keyboardType="phone-pad" />
                <Input label="المحافظة *"      value={form.city}     onChangeText={update("city")}     placeholder="القاهرة" />
                <Input label="الشارع *"        value={form.street}   onChangeText={update("street")}   placeholder="اسم الشارع" />
                <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                  <View style={{ flex: 1 }}><Input label="رقم المبنى" value={form.building} onChangeText={update("building")} placeholder="١٠" keyboardType="number-pad" /></View>
                  <View style={{ flex: 1 }}><Input label="الطابق"     value={form.floor}    onChangeText={update("floor")}    placeholder="٣"  keyboardType="number-pad" /></View>
                </View>
                <Input label="ملاحظات (اختياري)" value={form.notes} onChangeText={update("notes")} placeholder="أي تعليمات للتوصيل…" multiline numberOfLines={3} />
              </FormCard>
            </>
          ) : (
            <>
              <SectionTitle title="مراجعة الطلب" />
              <FormCard>
                {items.map((item) => (
                  <View key={item.productId} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.slate[100] }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.slate[800], flex: 1, textAlign: "right" }} numberOfLines={1}>
                      {item.product.nameAr ?? item.product.name} × {item.quantity}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: theme.colors.brand[700] }}>
                      {formatPrice(item.product.price * item.quantity)}
                    </Text>
                  </View>
                ))}
                <View style={{ gap: 8, marginTop: 8 }}>
                  <SummaryRow label="المجموع"  value={formatPrice(subtotal)} />
                  <SummaryRow label="التوصيل" value={delivery === 0 ? "مجاني 🎉" : formatPrice(delivery)} />
                  <View style={{ height: 1, backgroundColor: theme.colors.slate[200] }} />
                  <SummaryRow label="الإجمالي" value={formatPrice(total)} bold />
                </View>
              </FormCard>

              <FormCard>
                <SectionTitle title="عنوان التوصيل" small />
                <Text style={{ fontSize: 13, color: theme.colors.slate[700], textAlign: "right", lineHeight: 20 }}>
                  {form.name} — {form.phone}{"\n"}{form.street}، مبنى {form.building}، ط {form.floor}{"\n"}{form.city}
                </Text>
              </FormCard>
            </>
          )}
        </ScrollView>

        {/* CTA */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", padding: 16, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: theme.colors.slate[200], ...theme.shadow.lg }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={step === "details" ? () => {
              if (!form.name || !form.phone || !form.city || !form.street) return;
              setStep("review");
            } : handleConfirm}>
            {step === "details" ? "مراجعة الطلب ←" : `تأكيد الطلب (${formatPrice(total)})`}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ title, small }: { title: string; small?: boolean }) {
  return (
    <Text style={{ fontSize: small ? 13 : 15, fontWeight: "900", color: theme.colors.slate[800], textAlign: "right" }}>
      {title}
    </Text>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12, ...theme.shadow.sm }}>
      {children}
    </View>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 13, color: bold ? theme.colors.slate[900] : theme.colors.slate[600], fontWeight: bold ? "800" : "500" }}>{label}</Text>
      <Text style={{ fontSize: 13, color: bold ? theme.colors.brand[700] : theme.colors.slate[800], fontWeight: bold ? "900" : "700" }}>{value}</Text>
    </View>
  );
}
