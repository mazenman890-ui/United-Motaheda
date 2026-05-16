import React, { useCallback, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useCartStore } from "@/stores/cart";
import { useOrderStore } from "@/stores/orders";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

type Step = "details" | "review" | "success";
type PaymentMethod = "cod" | "instapay" | "vodafone";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}[] = [
  {
    id: "cod",
    label: "الدفع عند الاستلام",
    desc: "ادفع للمندوب عند التوصيل",
    icon: "cash-outline",
    color: theme.colors.green[600],
  },
  {
    id: "instapay",
    label: "إنستاباي",
    desc: "تحويل فوري عبر إنستاباي",
    icon: "phone-portrait-outline",
    color: theme.colors.brand[600],
  },
  {
    id: "vodafone",
    label: "فودافون كاش",
    desc: "تحويل عبر فودافون كاش",
    icon: "wallet-outline",
    color: "#E60000",
  },
];

const FREE_DELIVERY_THRESHOLD = 200;
const DELIVERY_FEE = 25;
const PROMO_DISCOUNT = 0.1;
const VALID_PROMOS = ["UNITED10"];

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const addOrder = useOrderStore((s) => s.addOrder);
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [requestPos, setRequestPos] = useState(false);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: "",
    city: "القاهرة",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    notes: "",
  });

  const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const discount = promoApplied ? Math.round(subtotal * PROMO_DISCOUNT * 100) / 100 : 0;
  const total = subtotal - discount + delivery;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const update = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isValidPhone = /^(010|011|012|015)\d{8}$/.test(
    form.phone.trim().replace(/\s/g, ""),
  );

  const canProceed =
    form.name.trim().length >= 2 &&
    isValidPhone &&
    form.city.trim() &&
    form.street.trim();

  const handleApplyPromo = useCallback(() => {
    const code = promoCode.trim().toUpperCase();
    if (VALID_PROMOS.includes(code)) {
      setPromoApplied(true);
      setPromoError("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setPromoApplied(false);
      setPromoError("كود الخصم غير صالح");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [promoCode]);

  const goToReview = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setStep("review");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addOrder({
      items: items.map((i) => ({
        productId: i.productId,
        name: i.product.nameAr ?? i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        imageUrl: i.product.imageUrl,
      })),
      subtotal,
      delivery,
      total,
      address: {
        name: form.name,
        phone: form.phone,
        city: form.city,
        street: form.street,
        building: form.building || undefined,
        floor: form.floor || undefined,
        notes: form.notes || undefined,
      },
    });
    clearCart();
    setStep("success");
    setLoading(false);
  };

  // ─── Success screen ──────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5FDFC" }}>
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            justifyContent: "center",
            padding: 28,
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
          }}>
          {/* Animated check */}
          <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center", marginBottom: 8 }}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 40,
                backgroundColor: theme.colors.slate[900],
                alignItems: "center",
                justifyContent: "center",
                ...theme.shadow.xl,
              }}>
              <Ionicons name="checkmark-circle" size={60} color="#fff" />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: theme.fonts.black,
                color: theme.colors.slate[400],
                letterSpacing: 3,
                textTransform: "uppercase",
                marginTop: 20,
                marginBottom: 8,
              }}>
              تم الاستلام
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontFamily: theme.fonts.black,
                color: theme.colors.slate[900],
                textAlign: "center",
                marginBottom: 10,
              }}>
              تم تأكيد طلبك بنجاح!
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: theme.fonts.semibold,
                color: theme.colors.slate[500],
                textAlign: "center",
                lineHeight: 22,
                paddingHorizontal: 10,
              }}>
              تم استلام طلبك بنجاح، وسيتواصل فريقنا معك قريباً لتأكيد التوصيل.
            </Text>
          </Animated.View>

          {/* Order ID badge */}
          <Animated.View
            entering={FadeInDown.delay(350).duration(400)}
            style={{
              marginTop: 18,
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#fff",
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: theme.colors.slate[200],
            }}>
            <Ionicons name="checkmark-circle" size={15} color={theme.colors.slate[600]} />
            <Text style={{ fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.slate[700] }}>
              رقم الطلب: #{Date.now().toString(36).toUpperCase().slice(-6)}
            </Text>
          </Animated.View>

          {/* Delivery card */}
          <Animated.View
            entering={FadeInDown.delay(450).duration(400)}
            style={{
              marginTop: 20,
              width: "100%",
              backgroundColor: "#fff",
              borderRadius: theme.radius["2xl"],
              padding: 16,
              borderWidth: 1,
              borderColor: theme.colors.slate[100],
              ...theme.shadow.sm,
            }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: theme.colors.slate[50],
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <Ionicons name="bicycle-outline" size={22} color={theme.colors.slate[700]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.slate[900], textAlign: "right" }}>
                  التوصيل المتوقع
                </Text>
                <Text style={{ fontSize: 12, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500], textAlign: "right" }}>
                  خلال 15-30 دقيقة من تأكيد الطلب
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Summary card */}
          <Animated.View
            entering={FadeInDown.delay(550).duration(400)}
            style={{
              marginTop: 12,
              width: "100%",
              backgroundColor: "#fff",
              borderRadius: theme.radius["2xl"],
              padding: 16,
              gap: 10,
              borderWidth: 1,
              borderColor: theme.colors.slate[100],
              ...theme.shadow.sm,
            }}>
            <SummaryRow label="الإجمالي" value={formatPrice(total)} bold />
            <SummaryRow
              label="التوصيل"
              value={delivery === 0 ? "مجاني" : formatPrice(delivery)}
              valueGreen={delivery === 0}
            />
            {discount > 0 && (
              <SummaryRow label="الخصم" value={`- ${formatPrice(discount)}`} valueGreen />
            )}
            <SummaryRow label="عدد المنتجات" value={`${totalItems} منتج`} />
            <SummaryRow
              label="طريقة الدفع"
              value={PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label ?? ""}
            />
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInUp.delay(650).duration(400)} style={{ width: "100%", marginTop: 24, gap: 6 }}>
            <Button variant="primary" size="lg" fullWidth gradient onPress={() => router.replace("/(tabs)/")}>
              مواصلة التسوق
            </Button>
            <Button variant="ghost" size="sm" fullWidth onPress={() => router.push("/orders")}>
              عرض طلباتي
            </Button>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ─── Empty cart ──────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 26,
            backgroundColor: theme.colors.slate[100],
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}>
          <Ionicons name="cart-outline" size={36} color={theme.colors.slate[400]} />
        </View>
        <Text style={{ fontSize: 18, fontFamily: theme.fonts.black, color: theme.colors.slate[800], marginBottom: 8 }}>
          السلة فارغة
        </Text>
        <Text style={{ fontSize: 13, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500], textAlign: "center", lineHeight: 21, marginBottom: 24 }}>
          لا يمكنك إكمال الطلب بدون منتجات.{"\n"}ابدأ بإضافة ما تحتاجه.
        </Text>
        <Button variant="primary" size="lg" gradient onPress={() => router.replace("/(tabs)/products")}>
          تصفح المنتجات
        </Button>
      </View>
    );
  }

  // ─── Main checkout ───────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: "#F5FDFC" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: 16,
            paddingBottom: 14,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.slate[100],
            ...theme.shadow.sm,
          }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: theme.colors.slate[50],
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.slate[200],
                }}>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.slate[600]} />
              </View>
            </Pressable>

            <Text
              style={{
                flex: 1,
                fontSize: 17,
                fontFamily: theme.fonts.black,
                color: theme.colors.slate[900],
                textAlign: "right",
              }}>
              إتمام الطلب
            </Text>

            {/* Secure badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: theme.colors.slate[900],
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}>
              <Ionicons name="shield-checkmark" size={11} color="#fff" />
              <Text style={{ fontSize: 9, fontFamily: theme.fonts.black, color: "#fff", letterSpacing: 0.5 }}>
                آمن
              </Text>
            </View>
          </View>

          {/* Step indicator */}
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", marginTop: 14, gap: 0 }}>
            <StepPill num={1} label="التوصيل" active={step === "details"} done={step === "review"} />
            <StepLine active={step === "review"} />
            <StepPill num={2} label="المراجعة" active={step === "review"} done={false} />
          </View>
        </View>

        {/* ── Content ────────────────────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            padding: 16,
            gap: 14,
            paddingBottom: 120 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled">

          {step === "details" ? (
            <>
              {/* Delivery signals */}
              <Animated.View entering={FadeInDown.duration(350)} style={{ flexDirection: "row-reverse", gap: 8 }}>
                {[
                  { icon: "bicycle-outline" as const, label: "15-30 دقيقة", sub: "وقت التوصيل" },
                  { icon: "shield-checkmark-outline" as const, label: "دفع آمن", sub: "مشفر 256-bit" },
                  { icon: "gift-outline" as const, label: `${totalItems} منتج`, sub: "في طلبك" },
                ].map((s, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.xl,
                      padding: 10,
                      alignItems: "center",
                      gap: 4,
                      borderWidth: 1,
                      borderColor: theme.colors.slate[100],
                    }}>
                    <Ionicons name={s.icon} size={18} color={theme.colors.brand[600]} />
                    <Text style={{ fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.slate[800] }}>
                      {s.label}
                    </Text>
                    <Text style={{ fontSize: 9, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400] }}>
                      {s.sub}
                    </Text>
                  </View>
                ))}
              </Animated.View>

              {/* Address form */}
              <Animated.View entering={FadeInDown.delay(100).duration(350)}>
                <SectionCard title="بيانات التوصيل" iconName="location-outline">
                  <Input
                    label="الاسم الكامل *"
                    value={form.name}
                    onChangeText={update("name")}
                    placeholder="محمد أحمد"
                  />
                  <Input
                    label="رقم الهاتف *"
                    value={form.phone}
                    onChangeText={update("phone")}
                    placeholder="01xxxxxxxxx"
                    keyboardType="phone-pad"
                    error={form.phone.length > 0 && !isValidPhone ? "رقم هاتف مصري غير صالح" : undefined}
                  />
                  <View
                    style={{
                      backgroundColor: theme.colors.slate[50],
                      borderRadius: theme.radius.lg,
                      padding: 12,
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 8,
                      borderWidth: 1,
                      borderColor: theme.colors.slate[200],
                    }}>
                    <Ionicons name="location" size={16} color={theme.colors.brand[600]} />
                    <Text style={{ fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.slate[700] }}>
                      القاهرة
                    </Text>
                    <View
                      style={{
                        marginRight: "auto",
                        backgroundColor: theme.colors.amber[50],
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: theme.colors.amber[200],
                      }}>
                      <Text style={{ fontSize: 9, fontFamily: theme.fonts.black, color: theme.colors.amber[700] }}>
                        القاهرة فقط حالياً
                      </Text>
                    </View>
                  </View>
                  <Input
                    label="الشارع والمنطقة *"
                    value={form.street}
                    onChangeText={update("street")}
                    placeholder="مثال: شارع النصر، المعادي"
                  />
                  <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="رقم المبنى"
                        value={form.building}
                        onChangeText={update("building")}
                        placeholder="١٠"
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="الطابق"
                        value={form.floor}
                        onChangeText={update("floor")}
                        placeholder="٣"
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="الشقة"
                        value={form.apartment}
                        onChangeText={update("apartment")}
                        placeholder="٥"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <Input
                    label="ملاحظات للسائق (اختياري)"
                    value={form.notes}
                    onChangeText={update("notes")}
                    placeholder="أي تعليمات إضافية…"
                    multiline
                    numberOfLines={3}
                  />
                </SectionCard>
              </Animated.View>

              {/* Payment method */}
              <Animated.View entering={FadeInDown.delay(200).duration(350)}>
                <SectionCard title="طريقة الدفع" iconName="card-outline">
                  {PAYMENT_METHODS.map((m) => {
                    const selected = paymentMethod === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => {
                          setPaymentMethod(m.id);
                          Haptics.selectionAsync().catch(() => {});
                        }}
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          gap: 12,
                          padding: 14,
                          borderRadius: theme.radius.xl,
                          backgroundColor: selected ? theme.colors.brand[50] : theme.colors.slate[50],
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? theme.colors.brand[400] : theme.colors.slate[200],
                        }}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: selected ? theme.colors.brand[600] : theme.colors.slate[300],
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                          {selected && (
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: theme.colors.brand[600],
                              }}
                            />
                          )}
                        </View>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: "#fff",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                          <Ionicons name={m.icon} size={18} color={m.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.slate[800], textAlign: "right" }}>
                            {m.label}
                          </Text>
                          <Text style={{ fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500], textAlign: "right" }}>
                            {m.desc}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}

                  {/* POS machine option for COD */}
                  {paymentMethod === "cod" && (
                    <Pressable
                      onPress={() => {
                        setRequestPos((p) => !p);
                        Haptics.selectionAsync().catch(() => {});
                      }}
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 10,
                        padding: 12,
                        borderRadius: theme.radius.lg,
                        backgroundColor: "#fff",
                        borderWidth: 1,
                        borderColor: theme.colors.slate[200],
                      }}>
                      <Ionicons
                        name={requestPos ? "checkbox" : "square-outline"}
                        size={20}
                        color={requestPos ? theme.colors.brand[600] : theme.colors.slate[400]}
                      />
                      <Text style={{ fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.slate[700] }}>
                        أطلب ماكينة دفع (POS)
                      </Text>
                    </Pressable>
                  )}

                  {/* Disabled methods */}
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      borderRadius: theme.radius.xl,
                      backgroundColor: theme.colors.slate[50],
                      borderWidth: 1,
                      borderColor: theme.colors.slate[200],
                      opacity: 0.5,
                      borderStyle: "dashed",
                    }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: "#fff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                      <Ionicons name="link-outline" size={18} color={theme.colors.slate[400]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.slate[600], textAlign: "right" }}>
                        رابط دفع إلكتروني
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "right" }}>
                        قريباً — سيتم إضافته لاحقاً
                      </Text>
                    </View>
                  </View>
                </SectionCard>
              </Animated.View>

              {/* Free delivery banner */}
              {subtotal < FREE_DELIVERY_THRESHOLD && (
                <Animated.View entering={FadeInDown.delay(300).duration(350)}>
                  <LinearGradient
                    colors={[theme.colors.amber[50], theme.colors.amber[100]]}
                    style={{
                      borderRadius: theme.radius.xl,
                      padding: 14,
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 10,
                      borderWidth: 1,
                      borderColor: theme.colors.amber[200],
                    }}>
                    <Ionicons name="bicycle" size={20} color={theme.colors.amber[600]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.amber[800], textAlign: "right" }}>
                        أضف {formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)} للتوصيل المجاني!
                      </Text>
                      <View
                        style={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.colors.amber[200],
                          marginTop: 6,
                          overflow: "hidden",
                        }}>
                        <View
                          style={{
                            height: "100%",
                            width: `${Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100)}%`,
                            backgroundColor: theme.colors.amber[500],
                            borderRadius: 2,
                          }}
                        />
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>
              )}
            </>
          ) : (
            /* ── Review step ──────────────────────────────────── */
            <>
              {/* Order items with images */}
              <Animated.View entering={FadeInDown.duration(350)}>
                <SectionCard title={`مراجعة الطلب (${totalItems} منتج)`} iconName="cart-outline">
                  {items.map((item, idx) => (
                    <View
                      key={item.productId}
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 10,
                        borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                        borderBottomColor: theme.colors.slate[100],
                      }}>
                      {item.product.imageUrl ? (
                        <Image
                          source={{ uri: item.product.imageUrl }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: theme.colors.slate[100],
                            borderWidth: 1,
                            borderColor: theme.colors.slate[100],
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: theme.colors.brand[50],
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                          <Ionicons name="medical" size={20} color={theme.colors.brand[400]} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: theme.fonts.bold,
                            color: theme.colors.slate[800],
                            textAlign: "right",
                            lineHeight: 18,
                          }}
                          numberOfLines={2}>
                          {item.product.nameAr ?? item.product.name}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "right" }}>
                          × {item.quantity}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.amber[600] }}>
                        {formatPrice(item.product.price * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </SectionCard>
              </Animated.View>

              {/* Promo code */}
              <Animated.View entering={FadeInDown.delay(100).duration(350)}>
                <SectionCard title="كود الخصم" iconName="pricetag-outline">
                  <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={promoCode}
                        onChangeText={setPromoCode}
                        placeholder="أدخل كود الخصم"
                        editable={!promoApplied}
                        placeholderTextColor={theme.colors.slate[400]}
                        style={{
                          height: 44,
                          borderRadius: theme.radius.lg,
                          backgroundColor: theme.colors.slate[50],
                          borderWidth: 1,
                          borderColor: promoError ? theme.colors.red[400] : theme.colors.slate[200],
                          paddingHorizontal: 14,
                          fontSize: 13,
                          fontFamily: theme.fonts.semibold,
                          color: theme.colors.slate[800],
                          textAlign: "right",
                        }}
                      />
                    </View>
                    <Pressable
                      onPress={handleApplyPromo}
                      disabled={promoApplied || !promoCode.trim()}
                      style={{
                        height: 44,
                        paddingHorizontal: 18,
                        borderRadius: theme.radius.lg,
                        backgroundColor: promoApplied
                          ? theme.colors.slate[100]
                          : theme.colors.brand[600],
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: promoApplied || !promoCode.trim() ? 0.6 : 1,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: theme.fonts.black,
                          color: promoApplied ? theme.colors.slate[600] : "#fff",
                        }}>
                        {promoApplied ? "مفعّل ✓" : "تطبيق"}
                      </Text>
                    </Pressable>
                  </View>
                  {promoError ? (
                    <Text style={{ fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.red[500], textAlign: "right" }}>
                      {promoError}
                    </Text>
                  ) : null}
                  {promoApplied && (
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 5 }}>
                      <Ionicons name="gift" size={13} color={theme.colors.green[600]} />
                      <Text style={{ fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.green[700] }}>
                        تم تفعيل خصم 10%
                      </Text>
                    </View>
                  )}
                </SectionCard>
              </Animated.View>

              {/* Price breakdown */}
              <Animated.View entering={FadeInDown.delay(200).duration(350)}>
                <SectionCard title="ملخص الطلب" iconName="receipt-outline">
                  <SummaryRow label="المجموع الجزئي" value={formatPrice(subtotal)} />
                  {discount > 0 && (
                    <SummaryRow label="خصم الكود" value={`- ${formatPrice(discount)}`} valueGreen />
                  )}
                  <SummaryRow
                    label="التوصيل"
                    value={delivery === 0 ? "مجاني" : formatPrice(delivery)}
                    valueGreen={delivery === 0}
                  />
                  <SummaryRow
                    label="وقت التوصيل المتوقع"
                    value="15-30 دقيقة"
                  />
                  <View style={{ height: 1.5, backgroundColor: theme.colors.slate[100], marginVertical: 2 }} />
                  <SummaryRow label="الإجمالي" value={formatPrice(total)} bold />
                </SectionCard>
              </Animated.View>

              {/* Address card */}
              <Animated.View entering={FadeInDown.delay(300).duration(350)}>
                <SectionCard title="عنوان التوصيل" iconName="location-outline">
                  <View
                    style={{
                      backgroundColor: theme.colors.slate[50],
                      borderRadius: theme.radius.lg,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: theme.colors.slate[100],
                    }}>
                    <Text style={{ fontSize: 14, fontFamily: theme.fonts.extrabold, color: theme.colors.text.primary, textAlign: "right", marginBottom: 4 }}>
                      {form.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.slate[600], textAlign: "right", lineHeight: 20, fontFamily: theme.fonts.semibold }}>
                      {form.phone}{"\n"}
                      {form.street}
                      {form.building ? `، مبنى ${form.building}` : ""}
                      {form.floor ? `، ط ${form.floor}` : ""}
                      {form.apartment ? `، شقة ${form.apartment}` : ""}
                      {"\n"}{form.city}
                    </Text>
                  </View>
                  <Pressable onPress={() => { setStep("details"); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}>
                    <Text style={{ fontSize: 12, color: theme.colors.brand[600], fontFamily: theme.fonts.bold, textAlign: "right" }}>
                      تعديل العنوان
                    </Text>
                  </Pressable>
                </SectionCard>
              </Animated.View>

              {/* Payment method card */}
              <Animated.View entering={FadeInDown.delay(350).duration(350)}>
                <SectionCard title="طريقة الدفع" iconName="card-outline">
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                    {(() => {
                      const m = PAYMENT_METHODS.find((pm) => pm.id === paymentMethod)!;
                      return (
                        <>
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              backgroundColor: theme.colors.brand[50],
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                            <Ionicons name={m.icon} size={18} color={m.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.slate[800], textAlign: "right" }}>
                              {m.label}
                            </Text>
                            {requestPos && paymentMethod === "cod" && (
                              <Text style={{ fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.brand[600], textAlign: "right" }}>
                                + ماكينة دفع مطلوبة
                              </Text>
                            )}
                          </View>
                        </>
                      );
                    })()}
                    <Pressable onPress={() => { setStep("details"); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}>
                      <Text style={{ fontSize: 12, color: theme.colors.brand[600], fontFamily: theme.fonts.bold }}>
                        تعديل
                      </Text>
                    </Pressable>
                  </View>
                </SectionCard>
              </Animated.View>

              {/* Trust badges */}
              <Animated.View
                entering={FadeInDown.delay(400).duration(350)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: theme.radius["2xl"],
                  padding: 14,
                  gap: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.slate[100],
                }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                  <Ionicons name="shield-checkmark" size={15} color={theme.colors.slate[600]} />
                  <Text style={{ fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.slate[700] }}>
                    دفع آمن ومشفر
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500], textAlign: "right", lineHeight: 18 }}>
                  لن يمكن تأكيد الطلب إلا بعد إدخال الاسم ورقم الهاتف والعنوان بشكل صحيح. بياناتك محمية بتشفير 256-bit SSL.
                </Text>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {/* ── Bottom CTA ─────────────────────────────────────────── */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 14,
            borderTopWidth: 1,
            borderTopColor: theme.colors.slate[100],
            ...theme.shadow.lg,
          }}>
          {/* Mini summary */}
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500] }}>
              {totalItems} منتج
            </Text>
            <Text style={{ fontSize: 16, fontFamily: theme.fonts.black, color: theme.colors.slate[900] }}>
              {formatPrice(total)}
            </Text>
          </View>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            gradient
            loading={loading}
            disabled={step === "details" && !canProceed}
            onPress={step === "details" ? goToReview : handleConfirm}>
            {step === "details"
              ? "مراجعة الطلب"
              : `تأكيد الطلب — ${formatPrice(total)}`}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step indicator components ─────────────────────────────────────────────

function StepPill({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  const filled = active || done;
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: filled ? theme.colors.brand[600] : theme.colors.slate[100],
          alignItems: "center",
          justifyContent: "center",
          borderWidth: filled ? 0 : 1,
          borderColor: theme.colors.slate[200],
        }}>
        {done ? (
          <Ionicons name="checkmark" size={13} color="#fff" />
        ) : (
          <Text
            style={{
              color: filled ? "#fff" : theme.colors.slate[400],
              fontSize: 11,
              fontFamily: theme.fonts.black,
            }}>
            {num}
          </Text>
        )}
      </View>
      <Text
        style={{
          fontSize: 11,
          fontFamily: filled ? theme.fonts.black : theme.fonts.semibold,
          color: filled ? theme.colors.brand[700] : theme.colors.slate[400],
        }}>
        {label}
      </Text>
    </View>
  );
}

function StepLine({ active }: { active: boolean }) {
  return (
    <View
      style={{
        width: 32,
        height: 2,
        backgroundColor: active ? theme.colors.brand[500] : theme.colors.slate[200],
        marginHorizontal: 8,
      }}
    />
  );
}

// ─── Section card ──────────────────────────────────────────────────────────

function SectionCard({
  title,
  iconName,
  children,
}: {
  title: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: theme.radius["2xl"],
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.04)",
        ...theme.shadow.sm,
      }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: theme.colors.brand[50],
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Ionicons name={iconName} size={16} color={theme.colors.brand[600]} />
        </View>
        <Text style={{ fontSize: 14, fontFamily: theme.fonts.black, color: theme.colors.slate[800] }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

// ─── Summary row ───────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  bold,
  valueGreen,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueGreen?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
      <Text
        style={{
          fontSize: bold ? 14 : 13,
          color: bold ? theme.colors.slate[900] : theme.colors.slate[500],
          fontFamily: bold ? theme.fonts.extrabold : theme.fonts.semibold,
        }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: bold ? 16 : 13,
          color: valueGreen
            ? theme.colors.green[600]
            : bold
              ? theme.colors.amber[600]
              : theme.colors.slate[800],
          fontFamily: bold ? theme.fonts.black : theme.fonts.bold,
        }}>
        {value}
      </Text>
    </View>
  );
}
