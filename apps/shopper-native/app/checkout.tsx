/**
 * Checkout screen — built on the canonical checkout architecture.
 *
 * Source of truth:
 *   - Pricing:    createCheckoutPricing (@/features/checkout)
 *   - Validation: Zod schema (@/features/checkout/schema)
 *   - Payload:    buildCheckoutSubmitCommand (@/features/checkout)
 *   - Submit:     createCheckoutOrder (@/features/checkout/api) — real Edge
 *                 Function call; falls back to local orders store on network
 *                 failure so the user always gets a confirmation.
 *   - Delivery:   useDeliveryQuote (@/features/delivery) — Cairo-only v1;
 *                 Phase 4 will swap the hook implementation without touching
 *                 this screen.
 *
 * Flow:
 *   details → review → success
 *   (with empty-cart guard as a pre-render branch)
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCartStore, selectItemCount } from "@/stores/cart";
import { useOrderStore } from "@/stores/orders";
import { useAuth } from "@/contexts/AuthContext";

import {
  checkoutFormSchema,
  type CheckoutFormSchema,
  createCheckoutPricing,
  buildCheckoutSubmitCommand,
  buildCheckoutNote,
  createIdempotencyKey,
  createCheckoutOrder,
  CheckoutRequestError,
  formatCheckoutError,
  type CheckoutFormInput,
  type CheckoutPaymentMethod,
  type CheckoutPricing,
} from "@/features/checkout";
import {
  useDeliveryQuote,
  SUPPORTED_GOVERNORATE,
  FREE_DELIVERY_THRESHOLD,
} from "@/features/delivery";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
type Step = "details" | "review" | "success";

// ─── Payment method catalogue ─────────────────────────────────────────────────

const PAYMENT_METHODS: ReadonlyArray<{
  id: CheckoutPaymentMethod;
  title: string;
  description: string;
  icon: IoniconsName;
  color: string;
  bg: string;
}> = [
  {
    id: "cod",
    title: "الدفع عند الاستلام",
    description: "ادفع نقداً للمندوب",
    icon: "cash-outline",
    color: theme.colors.green[600],
    bg: theme.colors.green[50],
  },
  {
    id: "instapay",
    title: "إنستاباي",
    description: "تحويل فوري من حسابك البنكي",
    icon: "flash-outline",
    color: theme.colors.purple[600],
    bg: theme.colors.purple[50],
  },
  {
    id: "vodafone",
    title: "فودافون كاش",
    description: "ادفع من محفظتك الإلكترونية",
    icon: "wallet-outline",
    color: theme.colors.red[500],
    bg: theme.colors.red[50],
  },
];

function paymentLabel(id: CheckoutPaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.title ?? "الدفع عند الاستلام";
}

function buildDefaults(name?: string): CheckoutFormSchema {
  return {
    fullName: name ?? "",
    phone: "",
    city: SUPPORTED_GOVERNORATE.ar,
    streetName: "",
    buildingNumber: "",
    floor: "",
    apartmentNumber: "",
    note: "",
    promoCode: "",
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { user } = useAuth();

  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore(selectItemCount);
  const promoCodeFromStore = useCartStore((s) => s.promoCode);
  const setPromoCodeStore = useCartStore((s) => s.setPromoCode);
  const clearCart = useCartStore((s) => s.clearCart);
  const addOrder = useOrderStore((s) => s.addOrder);

  const cartLines = useMemo(
    () =>
      items
        .filter((i) => i.product && i.product.inStock && i.product.stock > 0)
        .map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.product.price ?? 0,
          name: i.product.name,
          code: i.product.code,
        })),
    [items],
  );

  const cartSubtotal = useMemo(
    () => cartLines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0),
    [cartLines],
  );

  const [step, setStep] = useState<Step>("details");
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("cod");
  const [requestPos, setRequestPos] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<CheckoutFormSchema>({
    resolver: zodResolver(checkoutFormSchema("ar")),
    defaultValues: buildDefaults(user?.name),
    mode: "onChange",
  });

  const deliveryQuote = useDeliveryQuote({ subtotal: cartSubtotal });

  const pricing: CheckoutPricing = useMemo(
    () =>
      createCheckoutPricing(cartLines, {
        promoCode: promoCodeFromStore,
        shippingFee: deliveryQuote.cost,
      }),
    [cartLines, promoCodeFromStore, deliveryQuote.cost],
  );

  const promoApplied = pricing.discount > 0;

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const goToReview = useCallback(async () => {
    const valid = await trigger();
    if (!valid) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setStep("review");
    scrollToTop();
  }, [trigger, scrollToTop]);

  const backToDetails = useCallback(() => {
    setStep("details");
    scrollToTop();
  }, [scrollToTop]);

  const handleApplyPromo = useCallback(() => {
    const code = (getValues("promoCode") ?? "").trim().toUpperCase();
    if (!code) return;
    setPromoCodeStore(code);
    setValue("promoCode", code);
    const willDiscount = createCheckoutPricing(cartLines, { promoCode: code }).discount > 0;
    if (willDiscount) {
      setPromoError(null);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setPromoError("كود الخصم غير صالح");
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [cartLines, getValues, setPromoCodeStore, setValue]);

  const onSubmit = useCallback(
    async (form: CheckoutFormSchema) => {
      if (cartLines.length === 0) return;
      setSubmitting(true);
      setSubmitError(null);

      const checkoutNote = buildCheckoutNote({
        note: form.note ?? "",
        paymentLabel: paymentLabel(paymentMethod),
        paymentMethod,
        requestPosMachine: requestPos,
        lang: "ar",
      });

      const command = buildCheckoutSubmitCommand({
        idempotencyKey: idempotencyKeyRef.current,
        user,
        form: form as unknown as CheckoutFormInput,
        pricing,
        paymentMethod,
        paymentLabel: paymentLabel(paymentMethod),
        requestPosMachine: requestPos,
        note: checkoutNote,
      });

      let orderId: string | null = null;

      try {
        const result = await createCheckoutOrder(command);
        orderId = result.orderId;
      } catch (err) {
        if (err instanceof CheckoutRequestError && err.code === "AUTH") {
          setSubmitError(formatCheckoutError(err, "ar"));
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          setSubmitting(false);
          return;
        }
        if (__DEV__) console.warn("[checkout] Edge Function failed, falling back to local:", err);
      }

      const localOrder = addOrder({
        items: pricing.lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          price: l.unitPrice,
          quantity: l.quantity,
          imageUrl: items.find((i) => i.productId === l.productId)?.product.imageUrl,
        })),
        subtotal: pricing.subtotal,
        delivery: pricing.shipping,
        total: pricing.total,
        address: {
          name: form.fullName,
          phone: form.phone,
          city: form.city,
          street: form.streetName,
          building: form.buildingNumber || undefined,
          floor: form.floor || undefined,
          notes:
            [form.apartmentNumber ? `شقة ${form.apartmentNumber}` : "", form.note]
              .filter(Boolean)
              .join("\n") || undefined,
        },
      });

      setPlacedOrderId(orderId ?? localOrder.id);
      clearCart();
      idempotencyKeyRef.current = createIdempotencyKey();

      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStep("success");
      scrollToTop();
      setSubmitting(false);
    },
    [cartLines, paymentMethod, requestPos, pricing, user, addOrder, items, clearCart, scrollToTop],
  );

  // ──── Empty cart guard ─────────────────────────────────────────────────────

  if (items.length === 0 && step !== "success") {
    return <EmptyCartScreen onBrowse={() => router.replace("/(tabs)/products")} insets={insets} />;
  }

  // ──── Success screen ───────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <SuccessScreen
        orderId={placedOrderId ?? ""}
        total={pricing.total}
        insets={insets}
        onContinue={() => router.replace("/(tabs)")}
        onViewOrders={() => router.push("/orders")}
      />
    );
  }

  // ──── Main screen ──────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.slate[700]} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>إتمام الطلب</Text>
          <Text style={styles.headerSub}>
            {step === "details" ? "خطوة 1 من 2 • تفاصيل التوصيل" : "خطوة 2 من 2 • مراجعة الطلب"}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="shield-checkmark" size={12} color={theme.colors.green[600]} />
          <Text style={styles.headerBadgeText}>آمن</Text>
        </View>
      </View>

      <View style={styles.stepBar}>
        <StepPill index={1} label="التوصيل" active={step === "details"} done={step === "review"} />
        <StepLine done={step === "review"} />
        <StepPill index={2} label="المراجعة" active={step === "review"} done={false} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {!deliveryQuote.isFree && pricing.subtotal > 0 && (
          <Animated.View entering={FadeInDown.duration(280)}>
            <LinearGradient
              colors={["#FEF3C7", "#FDE68A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.freeBanner}>
              <View style={styles.freeBannerHead}>
                <Ionicons name="gift-outline" size={16} color={theme.colors.amber[700]} />
                <Text style={styles.freeBannerTitle}>
                  أضف منتجات بقيمة {formatPrice(deliveryQuote.amountToFreeDelivery)} لتوصيل مجاني
                </Text>
              </View>
              <View style={styles.freeBarTrack}>
                <View
                  style={[
                    styles.freeBarFill,
                    {
                      width: `${Math.min(100, (pricing.subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` as any,
                    },
                  ]}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {step === "details" ? (
          <DetailsStep control={control} errors={errors} />
        ) : (
          <ReviewStep
            values={getValues()}
            paymentMethod={paymentMethod}
            requestPos={requestPos}
            promoApplied={promoApplied}
            promoError={promoError}
            pricing={pricing}
            deliveryQuote={deliveryQuote}
            submitError={submitError}
            onEditAddress={backToDetails}
            onEditPayment={backToDetails}
            onPaymentChange={(m) => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setPaymentMethod(m);
            }}
            onTogglePos={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setRequestPos((v) => !v);
            }}
            onApplyPromo={handleApplyPromo}
            control={control}
          />
        )}
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.ctaTotals}>
          <View>
            <Text style={styles.ctaTotalLabel}>الإجمالي</Text>
            <Text style={styles.ctaTotalValue}>{formatPrice(pricing.total)}</Text>
          </View>
          <View style={styles.ctaCount}>
            <Ionicons name="bag-handle" size={11} color={theme.colors.brand[600]} />
            <Text style={styles.ctaCountText}>{itemCount} منتج</Text>
          </View>
        </View>
        <Button
          variant="primary"
          size="md"
          fullWidth
          gradient
          loading={submitting}
          disabled={pricing.subtotal === 0 || !deliveryQuote.isDeliverable}
          onPress={step === "details" ? goToReview : handleSubmit(onSubmit)}>
          <View style={styles.ctaBtnInner}>
            <Text style={styles.ctaBtnText}>
              {step === "details" ? "متابعة للمراجعة" : "تأكيد الطلب"}
            </Text>
            <Ionicons name={step === "details" ? "arrow-back" : "checkmark"} size={15} color="#fff" />
          </View>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Details Step ────────────────────────────────────────────────────────────

function DetailsStep({ control, errors }: { control: any; errors: any }) {
  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <SectionCard title="المعلومات الشخصية" icon="person-outline" delay={50}>
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <Input
              label="الاسم الكامل"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="محمد أحمد"
              error={errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              label="رقم الهاتف"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="01xxxxxxxxx"
              keyboardType="phone-pad"
              error={errors.phone?.message}
            />
          )}
        />
      </SectionCard>

      <SectionCard title="عنوان التوصيل" icon="location-outline" delay={120}>
        <View style={styles.cityCard}>
          <View style={styles.cityHead}>
            <View style={styles.cityIcon}>
              <Ionicons name="business-outline" size={14} color={theme.colors.brand[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cityLabel}>المدينة</Text>
              <Text style={styles.cityValue}>{SUPPORTED_GOVERNORATE.ar}</Text>
            </View>
            <View style={styles.cityBadge}>
              <Text style={styles.cityBadgeText}>{SUPPORTED_GOVERNORATE.label}</Text>
            </View>
          </View>
        </View>

        <Controller
          control={control}
          name="streetName"
          render={({ field }) => (
            <Input
              label="الشارع والحي"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="مثال: شارع النصر، المعادي"
              error={errors.streetName?.message}
            />
          )}
        />

        <View style={styles.row3}>
          <Controller
            control={control}
            name="buildingNumber"
            render={({ field }) => (
              <View style={{ flex: 1 }}>
                <Input
                  label="رقم العمارة"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="١٠"
                  keyboardType="number-pad"
                  error={errors.buildingNumber?.message}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="floor"
            render={({ field }) => (
              <View style={{ flex: 1 }}>
                <Input
                  label="الطابق"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="٣"
                  keyboardType="number-pad"
                  optional
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="apartmentNumber"
            render={({ field }) => (
              <View style={{ flex: 1 }}>
                <Input
                  label="رقم الشقة"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="٥"
                  keyboardType="number-pad"
                  error={errors.apartmentNumber?.message}
                />
              </View>
            )}
          />
        </View>

        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <Input
              label="ملاحظات للمندوب"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="أي تعليمات إضافية…"
              multiline
              numberOfLines={3}
              optional
            />
          )}
        />
      </SectionCard>
    </Animated.View>
  );
}

// ─── Review Step ─────────────────────────────────────────────────────────────

function ReviewStep({
  values,
  paymentMethod,
  requestPos,
  promoApplied,
  promoError,
  pricing,
  deliveryQuote,
  submitError,
  onEditAddress,
  onEditPayment,
  onPaymentChange,
  onTogglePos,
  onApplyPromo,
  control,
}: {
  values: CheckoutFormSchema;
  paymentMethod: CheckoutPaymentMethod;
  requestPos: boolean;
  promoApplied: boolean;
  promoError: string | null;
  pricing: CheckoutPricing;
  deliveryQuote: ReturnType<typeof useDeliveryQuote>;
  submitError: string | null;
  onEditAddress: () => void;
  onEditPayment: () => void;
  onPaymentChange: (m: CheckoutPaymentMethod) => void;
  onTogglePos: () => void;
  onApplyPromo: () => void;
  control: any;
}) {
  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <SectionCard
        title="عنوان التوصيل"
        icon="location-outline"
        delay={50}
        action={{ label: "تعديل العنوان", onPress: onEditAddress }}>
        <Text style={styles.reviewLine}>{values.fullName}</Text>
        <Text style={styles.reviewSub}>{values.phone}</Text>
        <View style={styles.reviewDivider} />
        <Text style={styles.reviewLine}>
          {[
            values.streetName,
            values.buildingNumber && `عمارة ${values.buildingNumber}`,
            values.floor && `طابق ${values.floor}`,
            values.apartmentNumber && `شقة ${values.apartmentNumber}`,
            values.city,
          ]
            .filter(Boolean)
            .join("، ")}
        </Text>
        {values.note ? <Text style={styles.reviewSub}>ملاحظات: {values.note}</Text> : null}
      </SectionCard>

      <SectionCard
        title="طريقة الدفع"
        icon="card-outline"
        delay={110}
        action={{ label: "تعديل", onPress: onEditPayment }}>
        {PAYMENT_METHODS.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => onPaymentChange(m.id)}
            style={[
              styles.payOption,
              paymentMethod === m.id && {
                borderColor: m.color,
                borderWidth: 2,
                backgroundColor: m.bg + "30",
              },
            ]}>
            <View style={[styles.payRadio, paymentMethod === m.id && { borderColor: m.color }]}>
              {paymentMethod === m.id && (
                <View style={[styles.payRadioDot, { backgroundColor: m.color }]} />
              )}
            </View>
            <View style={[styles.payIcon, { backgroundColor: m.bg }]}>
              <Ionicons name={m.icon} size={18} color={m.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>{m.title}</Text>
              <Text style={styles.paySub}>{m.description}</Text>
            </View>
          </Pressable>
        ))}

        {paymentMethod === "cod" && (
          <Pressable
            onPress={onTogglePos}
            style={[styles.posToggle, requestPos && styles.posToggleActive]}>
            <View style={[styles.posCheck, requestPos && styles.posCheckActive]}>
              {requestPos && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={styles.posLabel}>أطلب ماكينة دفع (POS) مع المندوب</Text>
          </Pressable>
        )}

        <View style={styles.comingSoon}>
          <View style={[styles.payIcon, { backgroundColor: theme.colors.slate[100] }]}>
            <Ionicons name="link-outline" size={16} color={theme.colors.slate[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.payTitle, { color: theme.colors.slate[400] }]}>
              رابط دفع إلكتروني
            </Text>
            <Text style={styles.paySub}>قريباً</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="كود الخصم" icon="pricetag-outline" delay={170}>
        <Controller
          control={control}
          name="promoCode"
          render={({ field }) => (
            <View style={styles.promoRow}>
              <View style={{ flex: 1 }}>
                <Input
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="أدخل كود الخصم"
                  editable={!promoApplied}
                  error={promoError ?? undefined}
                />
              </View>
              <Pressable
                onPress={onApplyPromo}
                disabled={promoApplied}
                style={[styles.promoBtn, promoApplied && styles.promoBtnApplied]}>
                <Text style={[styles.promoBtnText, promoApplied && styles.promoBtnTextApplied]}>
                  {promoApplied ? "مفعّل ✓" : "تطبيق"}
                </Text>
              </Pressable>
            </View>
          )}
        />
        {promoApplied && (
          <View style={styles.promoSuccess}>
            <Ionicons name="gift" size={13} color={theme.colors.green[600]} />
            <Text style={styles.promoSuccessText}>تم تفعيل خصم 10%</Text>
          </View>
        )}
      </SectionCard>

      <SectionCard title="ملخص الطلب" icon="receipt-outline" delay={230}>
        <SummaryRow
          label={`المجموع الفرعي (${pricing.itemCount} منتج)`}
          value={formatPrice(pricing.subtotal)}
        />
        <SummaryRow
          label="رسوم التوصيل"
          value={deliveryQuote.isFree ? "مجاني" : formatPrice(deliveryQuote.cost)}
          valueColor={deliveryQuote.isFree ? theme.colors.green[600] : undefined}
        />
        {pricing.discount > 0 && (
          <SummaryRow
            label="الخصم"
            value={`−${formatPrice(pricing.discount)}`}
            valueColor={theme.colors.green[600]}
          />
        )}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryTotalRow}>
          <Text style={styles.summaryTotalLabel}>الإجمالي</Text>
          <Text style={styles.summaryTotalValue}>{formatPrice(pricing.total)}</Text>
        </View>
        <View style={styles.etaPill}>
          <Ionicons name="time-outline" size={12} color={theme.colors.brand[600]} />
          <Text style={styles.etaText}>
            التوصيل خلال {deliveryQuote.eta.min}–{deliveryQuote.eta.max} دقيقة
          </Text>
        </View>
      </SectionCard>

      {submitError && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.red[600]} />
          <Text style={styles.errorText}>{submitError}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepPill({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  const bg = done
    ? theme.colors.green[100]
    : active
    ? theme.colors.brand[100]
    : theme.colors.slate[100];
  const fg = done
    ? theme.colors.green[700]
    : active
    ? theme.colors.brand[700]
    : theme.colors.slate[500];

  return (
    <View style={[styles.stepPill, { backgroundColor: bg }]}>
      <View style={[styles.stepNum, { backgroundColor: fg }]}>
        {done ? (
          <Ionicons name="checkmark" size={11} color="#fff" />
        ) : (
          <Text style={styles.stepNumText}>{index}</Text>
        )}
      </View>
      <Text style={[styles.stepLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

function StepLine({ done }: { done: boolean }) {
  return (
    <View style={[styles.stepLine, done && { backgroundColor: theme.colors.green[200] }]} />
  );
}

function SectionCard({
  title,
  icon,
  delay,
  action,
  children,
}: {
  title: string;
  icon: IoniconsName;
  delay: number;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)} style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleWrap}>
          <View style={styles.sectionIcon}>
            <Ionicons name={icon} size={13} color={theme.colors.brand[600]} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={6}>
            <Text style={styles.sectionAction}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Animated.View>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ─── Empty cart screen ──────────────────────────────────────────────────────

function EmptyCartScreen({
  onBrowse,
  insets,
}: {
  onBrowse: () => void;
  insets: { top: number };
}) {
  return (
    <View style={[styles.emptyScreen, { paddingTop: insets.top + 80 }]}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cart-outline" size={42} color={theme.colors.brand[400]} />
      </View>
      <Text style={styles.emptyTitle}>السلة فارغة</Text>
      <Text style={styles.emptyDesc}>أضف منتجات لإتمام عملية الشراء</Text>
      <View style={{ marginTop: 24, alignSelf: "stretch", paddingHorizontal: 32 }}>
        <Button variant="primary" size="md" fullWidth gradient onPress={onBrowse}>
          <View style={styles.ctaBtnInner}>
            <Text style={styles.ctaBtnText}>تصفح المنتجات</Text>
            <Ionicons name="arrow-back" size={14} color="#fff" />
          </View>
        </Button>
      </View>
    </View>
  );
}

// ─── Success screen ─────────────────────────────────────────────────────────

function SuccessScreen({
  orderId,
  total,
  insets,
  onContinue,
  onViewOrders,
}: {
  orderId: string;
  total: number;
  insets: { top: number; bottom: number };
  onContinue: () => void;
  onViewOrders: () => void;
}) {
  return (
    <View style={[styles.successScreen, { paddingTop: insets.top + 30 }]}>
      <Animated.View entering={FadeInDown.duration(360)} style={styles.successIconWrap}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={40} color="#fff" />
        </View>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(120).duration(320)} style={styles.successTitle}>
        تم استلام طلبك
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(180).duration(320)} style={styles.successDesc}>
        سيتواصل معك المندوب لتأكيد التفاصيل
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(240).duration(320)} style={styles.successCard}>
        <View style={styles.successCardRow}>
          <Text style={styles.successCardLabel}>رقم الطلب</Text>
          <Text style={styles.successCardValue}>
            {orderId ? orderId.slice(-8).toUpperCase() : "—"}
          </Text>
        </View>
        <View style={styles.successCardRow}>
          <Text style={styles.successCardLabel}>الإجمالي</Text>
          <Text style={[styles.successCardValue, { color: theme.colors.brand[600] }]}>
            {formatPrice(total)}
          </Text>
        </View>
        <View style={styles.successCardRow}>
          <Text style={styles.successCardLabel}>التوصيل المتوقع</Text>
          <Text style={styles.successCardValue}>30–60 دقيقة</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(320).duration(320)}
        style={{
          marginTop: "auto",
          paddingBottom: insets.bottom + 12,
          alignSelf: "stretch",
          paddingHorizontal: 24,
          gap: 10,
        }}>
        <Button variant="primary" size="md" fullWidth gradient onPress={onViewOrders}>
          <View style={styles.ctaBtnInner}>
            <Text style={styles.ctaBtnText}>عرض طلباتي</Text>
            <Ionicons name="receipt-outline" size={14} color="#fff" />
          </View>
        </Button>
        <Button variant="ghost" size="md" fullWidth onPress={onContinue}>
          <Text style={{ fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.slate[600] }}>
            متابعة التسوق
          </Text>
        </Button>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.slate[50],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
    textAlign: "right",
  },
  headerSub: {
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[400],
    textAlign: "right",
  },
  headerBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.green[50],
  },
  headerBadgeText: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.green[700] },

  // Steps
  stepBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
  },
  stepPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stepNum: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 10, fontFamily: theme.fonts.black, color: "#fff" },
  stepLabel: { fontSize: 11, fontFamily: theme.fonts.bold },
  stepLine: { flex: 1, height: 2, backgroundColor: theme.colors.slate[100], borderRadius: 1 },

  // Free banner
  freeBanner: { borderRadius: 16, padding: 14, gap: 8, marginBottom: 12 },
  freeBannerHead: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  freeBannerTitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: theme.colors.amber[800],
    textAlign: "right",
  },
  freeBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(217,119,6,0.15)",
    overflow: "hidden",
  },
  freeBarFill: { height: "100%", backgroundColor: theme.colors.amber[600], borderRadius: 3 },

  // Section
  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    marginBottom: 12,
    ...theme.shadow.xs,
  },
  sectionHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionTitleWrap: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  sectionAction: { fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.brand[600] },
  sectionBody: { padding: 14, gap: 10 },

  // City card
  cityCard: {
    backgroundColor: theme.colors.brand[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.brand[100],
  },
  cityHead: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  cityIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  cityLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[500],
    textAlign: "right",
  },
  cityValue: {
    fontSize: 13,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
    textAlign: "right",
  },
  cityBadge: {
    backgroundColor: theme.colors.amber[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  cityBadgeText: { fontSize: 9, fontFamily: theme.fonts.bold, color: theme.colors.amber[800] },

  row3: { flexDirection: "row-reverse", gap: 8 },

  // Review
  reviewLine: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[800],
    textAlign: "right",
    lineHeight: 20,
  },
  reviewSub: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "right",
  },
  reviewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.slate[100],
    marginVertical: 6,
  },

  // Payment
  payOption: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
  },
  payRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.slate[300],
    alignItems: "center",
    justifyContent: "center",
  },
  payRadioDot: { width: 8, height: 8, borderRadius: 4 },
  payIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  payTitle: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    textAlign: "right",
  },
  paySub: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[400],
    textAlign: "right",
  },
  posToggle: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  posToggleActive: {
    backgroundColor: theme.colors.brand[50],
    borderColor: theme.colors.brand[200],
  },
  posCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.slate[300],
    alignItems: "center",
    justifyContent: "center",
  },
  posCheckActive: {
    backgroundColor: theme.colors.brand[600],
    borderColor: theme.colors.brand[600],
  },
  posLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[700],
    textAlign: "right",
  },
  comingSoon: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.slate[200],
    opacity: 0.5,
  },

  // Promo
  promoRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 8 },
  promoBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: theme.colors.brand[600],
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  promoBtnApplied: { backgroundColor: theme.colors.slate[200] },
  promoBtnText: { fontSize: 12, fontFamily: theme.fonts.black, color: "#fff" },
  promoBtnTextApplied: { color: theme.colors.slate[500] },
  promoSuccess: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.green[50],
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  promoSuccessText: { fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.green[700] },

  // Summary
  summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: 3 },
  summaryLabel: { fontSize: 12, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500] },
  summaryValue: { fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.slate[700] },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.slate[200],
    marginVertical: 8,
  },
  summaryTotalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
  },
  summaryTotalValue: { fontSize: 18, fontFamily: theme.fonts.black, color: theme.colors.brand[600] },
  etaPill: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.brand[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 6,
  },
  etaText: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.brand[700] },

  // Error
  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.red[50],
    borderWidth: 1,
    borderColor: theme.colors.red[100],
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.red[700],
    textAlign: "right",
    lineHeight: 18,
  },

  // CTA
  cta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    ...theme.shadow.lg,
  },
  ctaTotals: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaTotalLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[400],
    textAlign: "right",
  },
  ctaTotalValue: { fontSize: 18, fontFamily: theme.fonts.black, color: theme.colors.brand[600] },
  ctaCount: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.brand[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ctaCountText: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.brand[700] },
  ctaBtnInner: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  ctaBtnText: { fontSize: 14, fontFamily: theme.fonts.black, color: "#fff" },

  // Empty
  emptyScreen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  emptyDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[400],
    marginTop: 4,
    textAlign: "center",
  },

  // Success
  successScreen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconWrap: { marginBottom: 16 },
  successIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: theme.colors.green[500],
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.lg,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
    textAlign: "center",
  },
  successDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "center",
    marginTop: 6,
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
    alignSelf: "stretch",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    ...theme.shadow.sm,
  },
  successCardRow: { flexDirection: "row-reverse", justifyContent: "space-between" },
  successCardLabel: { fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500] },
  successCardValue: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.text.primary },
});
