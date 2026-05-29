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
 *   - Delivery:   useDeliveryQuote (@/features/delivery) — Cairo-only v1.
 *
 * Flow:
 *   details → review → success
 *   (with empty-cart guard as a pre-render branch)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCartStore, selectItemCount } from "@/stores/cart";
import { useOrderStore } from "@/stores/orders";
import { useCheckoutStore } from "@/stores/checkout";
import {
  useAuth,
  sendPhoneOtp,
  normalizeEgyptianPhone,
  PhoneVerifyModal,
  PHONE_VERIFICATION_ENABLED,
} from "@/features/auth";
import { supabase } from "@/lib/supabase";

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
  isManualWalletPayment,
  patchOrderManualPayment,
  type CheckoutFormInput,
  type CheckoutPaymentMethod,
  type CheckoutPricing,
} from "@/features/checkout";
import {
  ManualPaymentPanel,
  pickPaymentReceiptImage,
  uploadPaymentReceipt,
} from "@/features/payment";
import {
  useDeliveryContext,
  useLocationStore,
  SUPPORTED_GOVERNORATE,
  FREE_DELIVERY_THRESHOLD,
  BranchSelector,
  BranchCard,
  type Branch,
} from "@/features/delivery";
import {
  useAddressStore,
  selectDefaultAddress,
  type Address,
} from "@/features/addresses";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
type Step = "details" | "review" | "success";

// ─── Payment method catalogue ─────────────────────────────────────────────────

/** Base config for payment methods — i18n keys resolved at render time */
const PAYMENT_METHOD_CONFIGS: ReadonlyArray<{
  id:         CheckoutPaymentMethod;
  titleKey:   string;
  descKey:    string;
  icon:       IoniconsName;
  color:      string;
  bg:         string;
}> = [
  { id: "cod",      titleKey: "checkout.methodCodTitle",      descKey: "checkout.methodCodDesc",      icon: "cash-outline",   color: theme.colors.green[600],  bg: theme.colors.green[50]  },
  { id: "instapay", titleKey: "checkout.methodInstapayTitle",  descKey: "checkout.methodInstapayDesc",  icon: "flash-outline",  color: theme.colors.purple[600], bg: theme.colors.purple[50] },
  { id: "vodafone", titleKey: "checkout.methodVodafoneTitle",  descKey: "checkout.methodVodafoneDesc",  icon: "wallet-outline", color: theme.colors.red[500],    bg: theme.colors.red[50]    },
];

/** Arabic label used in order notes / Edge Function (locale-independent). */
const PAYMENT_LABEL_AR: Record<CheckoutPaymentMethod, string> = {
  cod:       "الدفع عند الاستلام",
  instapay:  "إنستاباي",
  vodafone:  "فودافون كاش",
};

function paymentLabel(id: CheckoutPaymentMethod): string {
  return PAYMENT_LABEL_AR[id] ?? PAYMENT_LABEL_AR.cod;
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
  const { t }  = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { user } = useAuth();

  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore(selectItemCount);
  const promoCodeFromStore = useCartStore((s) => s.promoCode);
  const setPromoCodeStore = useCartStore((s) => s.setPromoCode);
  const clearCart       = useCartStore((s) => s.clearCart);
  const ensureReservations  = useCartStore((s) => s.ensureReservations);
  const commitReservations  = useCartStore((s) => s.commitReservations);
  // After the Edge Function creates the order, we re-fetch the user's
  // orders so the new row shows up in the local cache + Orders tab.
  const refreshOrders   = useOrderStore((s) => s.hydrate);

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

  // Payment state lives in the store so it survives accidental back-navigation.
  const paymentMethod     = useCheckoutStore((s) => s.paymentMethod);
  const transferNumber    = useCheckoutStore((s) => s.transferNumber);
  const receiptUri        = useCheckoutStore((s) => s.receiptUri);
  const setPaymentMethod  = useCheckoutStore((s) => s.setPaymentMethod);
  const setTransferNumber = useCheckoutStore((s) => s.setTransferNumber);
  const setReceiptUri     = useCheckoutStore((s) => s.setReceiptUri);
  const resetCheckout     = useCheckoutStore((s) => s.reset);

  const [step, setStep] = useState<Step>("details");
  const [requestPos, setRequestPos] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [manualPaymentError, setManualPaymentError] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [savedProfilePhone, setSavedProfilePhone] = useState<string | null>(null);
  const [useAccountProfile, setUseAccountProfile] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState(false);

  const defaultAddress = useAddressStore(selectDefaultAddress);
  const fetchAddresses = useAddressStore((s) => s.fetch);

  // ── Selected branch — sourced from the global location store so the
  //    Cart screen and CartDrawer reflect the same branch the user picks
  //    here. Writes propagate through useDeliveryContext to every screen. ──
  const selectedBranchId    = useLocationStore((s) => s.selectedBranchId);
  const setSelectedBranchId = useLocationStore((s) => s.setSelectedBranchId);

  const idempotencyKeyRef = useRef(createIdempotencyKey());

  // Phone verification gate. When the user hits "Place order" with an
  // unverified phone, we stash the form, send an OTP to the form's phone,
  // and open the modal. On verify success → resume placement with the
  // stashed form. On cancel → block the order.
  const [otpPending, setOtpPending] = useState<{
    phone: string;
    form:  CheckoutFormSchema;
  } | null>(null);

  const [showAuthGate, setShowAuthGate] = useState(false);

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

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();

        if (!isMounted) return;
        if (!error && data?.phone) {
          setSavedProfilePhone(data.phone as string);
        }
      } catch {
        // ignore; fallback is manual input
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchAddresses(user.id);
  }, [user?.id, fetchAddresses]);

  useEffect(() => {
    if (!useAccountProfile) return;
    if (user?.name) {
      setValue("fullName", user.name, { shouldValidate: true, shouldDirty: true });
    }
    if (savedProfilePhone) {
      setValue("phone", savedProfilePhone, { shouldValidate: true, shouldDirty: true });
    }
  }, [useAccountProfile, user?.name, savedProfilePhone, setValue]);

  useEffect(() => {
    if (!useSavedAddress || !defaultAddress) return;
    setValue("streetName", defaultAddress.street, { shouldValidate: true, shouldDirty: true });
    setValue("buildingNumber", defaultAddress.building, { shouldValidate: true, shouldDirty: true });
    setValue("floor", defaultAddress.floor ?? "", { shouldValidate: true, shouldDirty: true });
    setValue("apartmentNumber", defaultAddress.apartment ?? "", { shouldValidate: true, shouldDirty: true });
  }, [useSavedAddress, defaultAddress, setValue]);

  // Canonical delivery quote — branch-aware, address-aware, GPS-aware.
  // Identical source as Cart tab + CartDrawer so all three screens agree.
  const deliveryQuote = useDeliveryContext();

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
      // Scroll to the top of the form so users can see the field errors
      scrollToTop();
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
      setPromoError(t("checkout.promoInvalid"));
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [cartLines, getValues, setPromoCodeStore, setValue]);

  /**
   * Actual order placement — builds the command and calls the Edge Function.
   * Called either directly from onSubmit (when phone is already verified)
   * or from the OTP-verified callback (after the user passes the phone
   * verification gate).
   */
  const placeOrderForForm = useCallback(
    async (form: CheckoutFormSchema): Promise<void> => {
      if (!user?.id) return; // onSubmit already guarded; defensive

      // ── Inventory pre-flight ────────────────────────────────────────────
      // Every cart line must have an active reservation BEFORE the order
      // hits the DB. If any item can't be reserved (out of stock since the
      // user added it), abort with a clear error — we won't place an order
      // that we can't deliver. Items already reserved during browsing keep
      // their existing reservations; only missing ones are reserved now.
      const reservationFailures = await ensureReservations();
      if (reservationFailures.length > 0) {
        const first = reservationFailures[0];
        setSubmitError(t("checkout.reservationFailed"));
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setSubmitting(false);
        return;
      }

      const checkoutNote = buildCheckoutNote({
        note: form.note ?? "",
        paymentLabel: paymentLabel(paymentMethod),
        paymentMethod,
        requestPosMachine: requestPos,
        lang: "ar",
      });

      const manual = isManualWalletPayment(paymentMethod);
      let paymentProofUrl: string | undefined;

      if (manual) {
        if (!transferNumber.trim()) {
          setManualPaymentError(t("checkout.missingTransferNum"));
          setSubmitting(false);
          return;
        }
        if (!receiptUri) {
          setManualPaymentError(t("checkout.missingReceipt"));
          setSubmitting(false);
          return;
        }
        setUploadingReceipt(true);
        try {
          paymentProofUrl = await uploadPaymentReceipt(user.id, receiptUri);
        } catch (uploadErr) {
          setManualPaymentError(
            uploadErr instanceof Error ? uploadErr.message : t("checkout.uploadReceiptError"),
          );
          setSubmitting(false);
          setUploadingReceipt(false);
          return;
        }
        setUploadingReceipt(false);
        setManualPaymentError(null);
      }

      const command = buildCheckoutSubmitCommand({
        idempotencyKey: idempotencyKeyRef.current,
        user,
        form: form as unknown as CheckoutFormInput,
        pricing,
        paymentMethod,
        paymentLabel: paymentLabel(paymentMethod),
        requestPosMachine: requestPos,
        note: checkoutNote,
        transferNumber: manual ? transferNumber : undefined,
        paymentProofUrl: manual ? paymentProofUrl : undefined,
      });

      let orderId: string;
      try {
        const result = await createCheckoutOrder(command);
        orderId = result.orderId;

        // Ensure proof fields + pending_payment are persisted (Edge Function or RLS patch).
        if (isManualWalletPayment(paymentMethod) && paymentProofUrl) {
          const needsPatch =
            result.status !== "pending_payment"
            || result.paymentStatus !== "pending_verification";
          if (needsPatch) {
            await patchOrderManualPayment(
              orderId,
              {
                transferNumber: transferNumber.trim(),
                paymentProofUrl,
              },
              paymentMethod,
            );
          }
        }
      } catch (err) {
        if (__DEV__) console.warn("[checkout] createCheckoutOrder failed:", err);
        if (err instanceof CheckoutRequestError) {
          setSubmitError(formatCheckoutError(err, "ar"));
        } else {
          setSubmitError(t("checkout.submitError"));
        }
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setSubmitting(false);
        return;
      }

      // ── Inventory commit ────────────────────────────────────────────────
      // Order is now in the DB. Convert every cart line's reservation from
      // 'reserved' to 'committed' atomically. Failures here are logged but
      // do not block the success path — the order is already placed; the
      // operations team will reconcile via the audit log.
      void commitReservations(orderId);

      void refreshOrders(user.id);

      setPlacedOrderId(orderId);
      clearCart();
      resetCheckout();
      idempotencyKeyRef.current = createIdempotencyKey();

      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStep("success");
      scrollToTop();
      setSubmitting(false);
    },
    [user, paymentMethod, requestPos, pricing, refreshOrders, clearCart, scrollToTop, ensureReservations, commitReservations, transferNumber, receiptUri, resetCheckout],
  );

  const handlePickReceipt = useCallback(async () => {
    setManualPaymentError(null);
    const picked = await pickPaymentReceiptImage();
    if (picked.ok) {
      setReceiptUri(picked.localUri);
      return;
    }
    if (!picked.cancelled) {
      setManualPaymentError(picked.message);
    }
  }, []);

  const onSubmit = useCallback(
    async (form: CheckoutFormSchema) => {
      if (cartLines.length === 0) return;
      setSubmitting(true);
      setSubmitError(null);

      // Auth guard — show the beautiful auth gate modal instead of scrolling.
      if (!user?.id) {
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setSubmitting(false);
        setShowAuthGate(true);
        return;
      }

      // Phone-verification gate. Order placement is blocked until the user
      // has a verified phone number — the delivery driver needs to be able
      // to reach a number we KNOW the customer owns, not a typed-in string
      // that could be wrong / a typo / someone else's.
      //
      // Strict-match rule: even when profile.phone_verified is true, if the
      // user typed a *different* phone into the checkout form for THIS order,
      // we re-verify that new number. Otherwise the delivery driver gets a
      // contact number we never confirmed the customer actually owns.
      //
      // While PHONE_VERIFICATION_ENABLED is OFF (Twilio not yet provisioned
      // for prod), the whole gate is bypassed and we place the order using
      // whatever phone the user typed in the form — no SMS round-trip.
      if (!PHONE_VERIFICATION_ENABLED) {
        await placeOrderForForm(form);
        return;
      }

      let phoneVerified = false;
      let profilePhone: string | null = null;
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("phone, phone_verified")
          .eq("id", user.id)
          .single();
        if (error) {
          if (__DEV__) console.warn("[checkout] profile lookup failed:", error.message);
        } else {
          phoneVerified = profile?.phone_verified === true;
          profilePhone  = (profile?.phone ?? null) as string | null;
        }
      } catch (e) {
        if (__DEV__) console.warn("[checkout] profile lookup threw:", e);
      }

      // If the form's phone doesn't match the profile's verified phone,
      // treat as unverified so we force re-verification of the new number.
      const formPhoneE164 = normalizeEgyptianPhone((form.phone ?? "").trim());
      const profilePhoneE164 = profilePhone ? normalizeEgyptianPhone(profilePhone) : null;
      if (phoneVerified && formPhoneE164 && formPhoneE164 !== profilePhoneE164) {
        phoneVerified = false;
      }

      if (!phoneVerified) {
        // Pick which phone to verify: prefer the one the user typed in the
        // form for THIS order (so the verified number matches the delivery
        // contact). Fall back to whatever's on the profile if the form is
        // somehow empty.
        const candidate = (form.phone ?? "").trim() || profilePhone || "";
        const e164 = normalizeEgyptianPhone(candidate);
        if (!e164) {
          setSubmitError(t("checkout.invalidPhone"));
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          setSubmitting(false);
          return;
        }

        try {
          await sendPhoneOtp(candidate);
          // Stash the form so we can resume placement after OTP success.
          setOtpPending({ phone: e164, form });
          // submitting stays true while the modal is open — the user sees
          // the place-order button disabled until verification completes
          // or they cancel.
        } catch (err) {
          if (__DEV__) console.warn("[checkout] sendPhoneOtp failed:", err);
          setSubmitError(t("checkout.otpSendError"));
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          setSubmitting(false);
        }
        return;
      }

      // Phone already verified → straight to order placement.
      await placeOrderForForm(form);
    },
    [cartLines, user, placeOrderForForm, scrollToTop, t],
  );

  const handleOtpVerified = useCallback((verifiedPhone: string): void => {
    if (!otpPending) return;
    const stashedForm = otpPending.form;
    setOtpPending(null);
    // If the user changed the number inside the modal, the verified phone
    // differs from the one originally on the form. Sync the form field so
    // the order we're about to place uses the contact number we actually
    // verified — not the stale typed-in one.
    const stashedE164 = normalizeEgyptianPhone(stashedForm.phone ?? "");
    if (verifiedPhone && verifiedPhone !== stashedE164) {
      const local = verifiedPhone.replace(/^\+20/, "0");
      setValue("phone", local, { shouldValidate: true, shouldDirty: true });
      stashedForm.phone = local;
    }
    // The sync_profile_phone_from_auth trigger fires inside the auth.users
    // UPDATE that verifyOtp performs server-side, so by the time we get
    // here profiles.phone_verified is already true. Resume placement.
    void placeOrderForForm(stashedForm);
  }, [otpPending, placeOrderForForm, setValue]);

  const handleOtpCancel = useCallback((): void => {
    setOtpPending(null);
    setSubmitting(false);
    setSubmitError(t("checkout.otpCancelled"));
  }, []);

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

      {/* ── Auth Gate Modal — beautiful intercept when not signed in ── */}
      <AuthGateModal
        visible={showAuthGate}
        onSignIn={() => { setShowAuthGate(false); router.push("/(auth)/login"); }}
        onDismiss={() => setShowAuthGate(false)}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.slate[700]} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <UIText variant="card-title" align="right" style={styles.headerTitleNew}>
            {t("checkout.title")}
          </UIText>
          <UIText variant="eyebrow" color="tertiary" align="right">
            {step === "details" ? t("checkout.titleStep1") : t("checkout.titleStep2")}
          </UIText>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="shield-checkmark" size={12} color={theme.colors.green[700]} />
          <UIText variant="eyebrow" style={{ color: theme.colors.green[700] }}>{t("checkout.secure")}</UIText>
        </View>
      </View>

      <View style={styles.stepBar}>
        <StepPill index={1} label={t("checkout.stepDelivery")} active={step === "details"} done={step === "review"} />
        <StepLine done={step === "review"} />
        <StepPill index={2} label={t("checkout.stepReview")} active={step === "review"} done={false} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {!deliveryQuote.isFree && pricing.subtotal > 0 && (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.freeBanner}>
            <View style={styles.freeBannerHead}>
              <View style={styles.freeBannerIcon}>
                <Ionicons name="gift-outline" size={14} color={theme.colors.amber[700]} />
              </View>
              <View style={{ flex: 1 }}>
                <UIText variant="eyebrow" style={{ color: theme.colors.amber[800] }}>
                  {t("cart.freeDelivery")}
                </UIText>
                <UIText variant="body-sm" align="right" style={styles.freeBannerTitleNew}>
                  {t("checkout.freeBannerTitle", { amount: formatPrice(deliveryQuote.amountToFreeDelivery) })}
                </UIText>
              </View>
            </View>
            <View style={styles.freeBarTrack}>
              <View
                style={[
                  styles.freeBarFill,
                  {
                    width: `${Math.min(100, (pricing.subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` as DimensionValue,
                  },
                ]}
              />
            </View>
          </Animated.View>
        )}

        {step === "details" ? (
          <DetailsStep
            control={control}
            errors={errors}
            selectedBranchId={selectedBranchId}
            onSelectBranch={(b: Branch) => setSelectedBranchId(b.id)}
            deliveryBranch={deliveryQuote.branch}
            outOfServiceMessage={deliveryQuote.outOfServiceMessage}
            user={user}
            savedProfilePhone={savedProfilePhone}
            useAccountProfile={useAccountProfile}
            onToggleAccountProfile={setUseAccountProfile}
            defaultAddress={defaultAddress}
            useSavedAddress={useSavedAddress}
            onToggleSavedAddress={setUseSavedAddress}
            paymentMethod={paymentMethod}
            onPaymentChange={(m) => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setPaymentMethod(m);
            }}
            subtotal={pricing.subtotal}
            onSignIn={() => router.push("/(auth)/login")}
          />
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
            transferNumber={transferNumber}
            onTransferNumberChange={setTransferNumber}
            receiptUri={receiptUri}
            onPickReceipt={handlePickReceipt}
            manualPaymentError={manualPaymentError}
            uploadingReceipt={uploadingReceipt}
            onEditAddress={backToDetails}
            onEditPayment={backToDetails}
            onPaymentChange={(m) => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setPaymentMethod(m);
              if (!isManualWalletPayment(m)) {
                setManualPaymentError(null);
              }
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
            <UIText variant="eyebrow" color="tertiary" align="right">{t("checkout.dueTotal")}</UIText>
            <UIText variant="sheet-title" align="right" style={styles.ctaTotalValueNew}>
              {formatPrice(pricing.total)}
            </UIText>
          </View>
          <View style={styles.ctaCount}>
            <Ionicons name="bag-handle" size={12} color={theme.colors.brand[700]} />
            <UIText variant="eyebrow" style={{ color: theme.colors.brand[700] }}>
              {t("checkout.itemsCount", { count: itemCount })}
            </UIText>
          </View>
        </View>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          gradient
          loading={submitting || uploadingReceipt}
          disabled={
            pricing.subtotal === 0
            || !deliveryQuote.isDeliverable
            || (step === "review"
              && isManualWalletPayment(paymentMethod)
              && (!transferNumber.trim() || !receiptUri))
          }
          onPress={step === "details" ? goToReview : handleSubmit(onSubmit)}>
          <View style={styles.ctaBtnInner}>
            <Text style={styles.ctaBtnText}>
              {step === "details" ? t("checkout.continueBtn") : t("checkout.confirmBtn")}
            </Text>
            <Ionicons name={step === "details" ? "arrow-back" : "checkmark"} size={16} color="#fff" />
          </View>
        </Button>
      </View>

      {/* Phone verification gate — opens when the user submits with an
          unverified phone. Modal handles SMS resend + 6-digit verify; on
          success we resume order placement with the stashed form. */}
      <PhoneVerifyModal
        visible={otpPending !== null}
        initialPhone={otpPending?.phone ?? ""}
        onVerified={handleOtpVerified}
        onCancel={handleOtpCancel}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Details Step ────────────────────────────────────────────────────────────

function DetailsStep({
  control,
  errors,
  selectedBranchId,
  onSelectBranch,
  deliveryBranch,
  outOfServiceMessage,
  user,
  savedProfilePhone,
  useAccountProfile,
  onToggleAccountProfile,
  defaultAddress,
  useSavedAddress,
  onToggleSavedAddress,
  paymentMethod,
  onPaymentChange,
  subtotal,
  onSignIn,
}: {
  control: any;
  errors: any;
  selectedBranchId: string | null;
  onSelectBranch: (b: Branch) => void;
  deliveryBranch: Branch | null;
  outOfServiceMessage: string | null;
  user: { name?: string | null } | null;
  savedProfilePhone: string | null;
  useAccountProfile: boolean;
  onToggleAccountProfile: (value: boolean) => void;
  defaultAddress: Address | null;
  useSavedAddress: boolean;
  onToggleSavedAddress: (value: boolean) => void;
  paymentMethod: CheckoutPaymentMethod;
  onPaymentChange: (m: CheckoutPaymentMethod) => void;
  subtotal: number;
  onSignIn: () => void;
}) {
  const { t, i18n } = useTranslation();
  const hasSavedAccount = Boolean(user?.name || savedProfilePhone);
  const sep = i18n.language.startsWith("en") ? ", " : "، ";
  const addressSummary = defaultAddress
    ? [
        defaultAddress.street,
        defaultAddress.building ? t("orders.building", { n: defaultAddress.building }) : null,
        defaultAddress.floor ? t("orders.floor", { n: defaultAddress.floor }) : null,
        defaultAddress.apartment ? t("orders.apt", { n: defaultAddress.apartment }) : null,
      ]
        .filter(Boolean)
        .join(sep)
    : null;

  return (
    <Animated.View entering={FadeIn.duration(220)}>

      {/* ── Sign-in required banner — shown at the TOP so it's never hidden */}
      {!user?.id && (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.signInBanner}>
          <View style={styles.signInBannerIcon}>
            <Ionicons name="person-circle-outline" size={22} color={theme.colors.brand[700]} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <UIText variant="body-sm" weight="extrabold" align="right" style={{ color: theme.colors.brand[800] }}>
              {t("checkout.signInRequired")}
            </UIText>
            <UIText variant="caption" color="secondary" align="right">
              {t("checkout.signInDesc")}
            </UIText>
          </View>
          <Pressable onPress={onSignIn} style={styles.signInBannerBtn} hitSlop={4}>
            <UIText variant="eyebrow" weight="bold" style={{ color: "#fff" }}>
              {t("checkout.signInBtn")}
            </UIText>
          </Pressable>
        </Animated.View>
      )}

      <SectionCard title={t("checkout.branchSection")} icon="storefront-outline" delay={20}>
        <Text style={styles.branchHint}>{t("checkout.branchHint")}</Text>
        <BranchSelector
          selectedId={selectedBranchId ?? deliveryBranch?.id ?? null}
          onSelect={onSelectBranch}
          compact
        />
        {outOfServiceMessage && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.branchWarning}>
            <Ionicons name="alert-circle-outline" size={14} color={theme.colors.amber[700]} />
            <Text style={styles.branchWarningText}>{outOfServiceMessage}</Text>
          </Animated.View>
        )}
      </SectionCard>

      {hasSavedAccount && (
        <SectionCard title={t("checkout.profileSection")} icon="person-circle-outline" delay={50}>
          <Text style={styles.savedHint}>{t("checkout.profileHint")}</Text>
          <View style={styles.toggleRow}>
            <Button
              variant={useAccountProfile ? "success" : "outline"}
              size="sm"
              onPress={() => onToggleAccountProfile(true)}
              style={{ flex: 1 }}>
              {t("checkout.useAccountData")}
            </Button>
            <Button
              variant={!useAccountProfile ? "secondary" : "ghost"}
              size="sm"
              onPress={() => onToggleAccountProfile(false)}
              style={{ flex: 1 }}>
              {t("checkout.enterNewData")}
            </Button>
          </View>
          <View style={styles.savedMetaRow}>
            <Text style={styles.savedMetaLabel}>{t("auth.name")}</Text>
            <Text style={styles.savedMetaValue}>{user?.name ?? "—"}</Text>
          </View>
          <View style={styles.savedMetaRow}>
            <Text style={styles.savedMetaLabel}>{t("auth.phone")}</Text>
            <Text style={styles.savedMetaValue}>{savedProfilePhone ?? "—"}</Text>
          </View>
          <Text style={styles.savedHelp}>
            {useAccountProfile ? t("checkout.saveProfileHint") : t("checkout.customDataHint")}
          </Text>
        </SectionCard>
      )}

      <SectionCard title={t("checkout.personalSection")} icon="person-outline" delay={hasSavedAccount ? 90 : 50}>
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <Input
              label={t("checkout.nameLabel")}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder={t("checkout.namePlaceholder")}
              error={errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              label={t("auth.phone")}
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

      <SectionCard title={t("checkout.addressSection")} icon="location-outline" delay={120}>
        {defaultAddress ? (
          <View style={styles.savedAddressBanner}>
            <Text style={styles.savedAddressTitle}>{t("checkout.defaultAddrTitle")}</Text>
            <Text style={styles.savedAddressText}>{t("checkout.defaultAddrHint")}</Text>
            <Text style={styles.savedAddressSummary}>{addressSummary}</Text>
            <View style={styles.toggleRow}>
              <Button
                variant={useSavedAddress ? "success" : "outline"}
                size="sm"
                onPress={() => onToggleSavedAddress(true)}
                style={{ flex: 1 }}>
                {t("checkout.useSavedAddress")}
              </Button>
              <Button
                variant={!useSavedAddress ? "secondary" : "ghost"}
                size="sm"
                onPress={() => onToggleSavedAddress(false)}
                style={{ flex: 1 }}>
                {t("checkout.enterNewAddress")}
              </Button>
            </View>
          </View>
        ) : (
          <Text style={styles.savedAddressText}>{t("checkout.noAddrHint")}</Text>
        )}

        <View style={styles.cityCard}>
          <View style={styles.cityHead}>
            <View style={styles.cityIcon}>
              <Ionicons name="business-outline" size={14} color={theme.colors.brand[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cityLabel}>{t("checkout.cityLabel")}</Text>
              <Text style={styles.cityValue}>{SUPPORTED_GOVERNORATE.ar}</Text>
            </View>
            <View style={styles.cityBadge}>
              <Text style={styles.cityBadgeText}>{t("checkout.cairoOnly")}</Text>
            </View>
          </View>
        </View>

        <Controller
          control={control}
          name="streetName"
          render={({ field }) => (
            <Input
              label={t("checkout.streetLabel")}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder={t("checkout.streetPlaceholder")}
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
                  label={t("checkout.buildingLabel")}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="10"
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
                  label={t("checkout.floorLabel")}
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder="3"
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
                  label={t("checkout.aptLabel")}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="5"
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
              label={t("checkout.notesLabel")}
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder={t("checkout.notesPlaceholder")}
              multiline
              numberOfLines={3}
              optional
            />
          )}
        />
      </SectionCard>

      <SectionCard title={t("checkout.paymentSection")} icon="card-outline" delay={160}>
        <PaymentMethodCards
          selected={paymentMethod}
          subtotal={subtotal}
          onChange={onPaymentChange}
        />
      </SectionCard>
    </Animated.View>
  );
}

// ─── Payment method cards ─────────────────────────────────────────────────────

function PaymentMethodCards({
  selected,
  subtotal,
  onChange,
}: {
  selected:  CheckoutPaymentMethod;
  subtotal:  number;
  onChange:  (m: CheckoutPaymentMethod) => void;
}) {
  const { t } = useTranslation();
  const recommended: CheckoutPaymentMethod = subtotal >= 500 ? "instapay" : "cod";
  const methods = PAYMENT_METHOD_CONFIGS.map((cfg) => ({
    ...cfg,
    title:       t(cfg.titleKey),
    description: t(cfg.descKey),
  }));

  return (
    <View style={styles.payCardsWrapper}>
      {methods.map((m, idx) => {
        const active = selected === m.id;
        const isRec  = m.id === recommended && !active;

        return (
          <Animated.View
            key={m.id}
            entering={FadeInDown.delay(idx * 70).duration(320).springify().damping(22)}>
            <Pressable
              onPress={() => onChange(m.id)}
              style={[
                styles.payCard,
                active && {
                  borderColor: m.color,
                  borderWidth: 2,
                  backgroundColor: m.bg + "28",
                },
              ]}>
              {isRec && (
                <View style={[styles.payCardBadge, { backgroundColor: m.color + "18", borderColor: m.color + "40" }]}>
                  <Ionicons name="star" size={8} color={m.color} />
                  <Text style={[styles.payCardBadgeText, { color: m.color }]}>{t("checkout.methodRecommended")}</Text>
                </View>
              )}

              <View style={styles.payCardRow}>
                <View style={[
                  styles.payCardCheck,
                  active && { backgroundColor: m.color, borderColor: m.color },
                ]}>
                  {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <View style={styles.payCardMeta}>
                  <View style={styles.payCardTextBlock}>
                    <Text style={[styles.payCardTitle, active && { color: m.color }]}>
                      {m.title}
                    </Text>
                    <Text style={styles.payCardSub}>{m.description}</Text>
                  </View>
                  <View style={[styles.payCardIcon, { backgroundColor: m.bg }]}>
                    <Ionicons name={m.icon} size={22} color={m.color} />
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
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
  transferNumber,
  onTransferNumberChange,
  receiptUri,
  onPickReceipt,
  manualPaymentError,
  uploadingReceipt,
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
  deliveryQuote: ReturnType<typeof useDeliveryContext>;
  submitError: string | null;
  transferNumber: string;
  onTransferNumberChange: (v: string) => void;
  receiptUri: string | null;
  onPickReceipt: () => void;
  manualPaymentError: string | null;
  uploadingReceipt: boolean;
  onEditAddress: () => void;
  onEditPayment: () => void;
  onPaymentChange: (m: CheckoutPaymentMethod) => void;
  onTogglePos: () => void;
  onApplyPromo: () => void;
  control: any;
}) {
  const { t, i18n } = useTranslation();
  const sep = i18n.language.startsWith("en") ? ", " : "، ";
  const methods = PAYMENT_METHOD_CONFIGS.map((cfg) => ({
    ...cfg,
    title:       t(cfg.titleKey),
    description: t(cfg.descKey),
  }));

  return (
    <Animated.View entering={FadeIn.duration(220)}>
      {deliveryQuote.branch && (
        <SectionCard
          title={t("checkout.branchSection")}
          icon="storefront-outline"
          delay={20}
          action={{ label: t("checkout.changeBranch"), onPress: onEditAddress }}>
          <BranchCard
            branch={deliveryQuote.branch}
            distanceKm={deliveryQuote.distanceKm ?? undefined}
            compact
          />
          <View style={styles.etaPillInline}>
            <Ionicons name="time-outline" size={12} color={theme.colors.brand[600]} />
            <Text style={styles.etaPillText}>
              {t("checkout.etaText", { min: deliveryQuote.eta.min, max: deliveryQuote.eta.max })}
            </Text>
          </View>
        </SectionCard>
      )}

      <SectionCard
        title={t("checkout.addressSection")}
        icon="location-outline"
        delay={50}
        action={{ label: t("checkout.editAddress"), onPress: onEditAddress }}>
        <Text style={styles.reviewLine}>{values.fullName}</Text>
        <Text style={styles.reviewSub}>{values.phone}</Text>
        <View style={styles.reviewDivider} />
        <Text style={styles.reviewLine}>
          {[
            values.streetName,
            values.buildingNumber && t("orders.building", { n: values.buildingNumber }),
            values.floor && t("orders.floor", { n: values.floor }),
            values.apartmentNumber && t("orders.apt", { n: values.apartmentNumber }),
            values.city,
          ]
            .filter(Boolean)
            .join(sep)}
        </Text>
        {values.note ? <Text style={styles.reviewSub}>{values.note}</Text> : null}
      </SectionCard>

      <SectionCard
        title={t("checkout.paymentSection")}
        icon="card-outline"
        delay={110}
        action={{ label: t("checkout.editPayment"), onPress: onEditPayment }}>
        {methods.map((m) => (
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
            <Text style={styles.posLabel}>{t("checkout.posRequest")}</Text>
          </Pressable>
        )}

        {isManualWalletPayment(paymentMethod) && (
          <View style={{ marginTop: 12 }}>
            <ManualPaymentPanel
              transferNumber={transferNumber}
              onTransferNumberChange={onTransferNumberChange}
              receiptUri={receiptUri}
              onPickReceipt={onPickReceipt}
              uploading={uploadingReceipt}
              error={manualPaymentError}
            />
          </View>
        )}

        <View style={styles.comingSoon}>
          <View style={[styles.payIcon, { backgroundColor: theme.colors.slate[100] }]}>
            <Ionicons name="link-outline" size={16} color={theme.colors.slate[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.payTitle, { color: theme.colors.slate[400] }]}>
              {t("checkout.paymentLink")}
            </Text>
            <Text style={styles.paySub}>{t("checkout.methodComingSoon")}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={t("checkout.promoSection")} icon="pricetag-outline" delay={170}>
        <Controller
          control={control}
          name="promoCode"
          render={({ field }) => (
            <View style={styles.promoRow}>
              <View style={{ flex: 1 }}>
                <Input
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  placeholder={t("checkout.promoPlaceholder")}
                  editable={!promoApplied}
                  error={promoError ?? undefined}
                />
              </View>
              <Pressable
                onPress={onApplyPromo}
                disabled={promoApplied}
                style={[styles.promoBtn, promoApplied && styles.promoBtnApplied]}>
                <Text style={[styles.promoBtnText, promoApplied && styles.promoBtnTextApplied]}>
                  {promoApplied ? t("checkout.promoApplied") : t("checkout.promoApply")}
                </Text>
              </Pressable>
            </View>
          )}
        />
        {promoApplied && (
          <View style={styles.promoSuccess}>
            <Ionicons name="gift" size={13} color={theme.colors.green[600]} />
            <Text style={styles.promoSuccessText}>{t("checkout.promoSuccess")}</Text>
          </View>
        )}
      </SectionCard>

      <SectionCard title={t("checkout.summarySection")} icon="receipt-outline" delay={230}>
        <SummaryRow
          label={t("checkout.subtotalRow", { count: pricing.itemCount })}
          value={formatPrice(pricing.subtotal)}
        />
        <SummaryRow
          label={t("checkout.deliveryRow")}
          value={deliveryQuote.isFree ? t("common.free") : formatPrice(deliveryQuote.cost)}
          valueColor={deliveryQuote.isFree ? theme.colors.green[600] : undefined}
        />
        {pricing.discount > 0 && (
          <SummaryRow
            label={t("checkout.discountRow")}
            value={`−${formatPrice(pricing.discount)}`}
            valueColor={theme.colors.green[600]}
          />
        )}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryTotalRow}>
          <Text style={styles.summaryTotalLabel}>{t("checkout.totalRow")}</Text>
          <Text style={styles.summaryTotalValue}>{formatPrice(pricing.total)}</Text>
        </View>
        <View style={styles.etaPill}>
          <Ionicons name="time-outline" size={12} color={theme.colors.brand[600]} />
          <Text style={styles.etaText}>
            {t("checkout.etaText", { min: deliveryQuote.eta.min, max: deliveryQuote.eta.max })}
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
  // Color routing:
  //   done   → success-tinted (locked-in stage)
  //   active → brand-tinted + subtle brand glow (current focus)
  //   idle   → quiet slate (waiting in line)
  const bg = done
    ? theme.colors.success.bg
    : active
    ? theme.colors.brand.lighter
    : theme.colors.slate[50];
  const fg = done
    ? theme.colors.success.strong
    : active
    ? theme.colors.brand[700]
    : theme.colors.slate[500];

  return (
    <View style={[
      styles.stepPill,
      { backgroundColor: bg },
      active && styles.stepPillActive,
    ]}>
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
    <View style={[styles.stepLine, done && { backgroundColor: theme.colors.success.base }]} />
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
    <Animated.View entering={FadeInDown.delay(delay).duration(360)} style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleWrap}>
          <View style={styles.sectionIcon}>
            <Ionicons name={icon} size={14} color={theme.colors.brand[700]} />
          </View>
          <UIText variant="card-title" align="right" style={styles.sectionTitleNew}>
            {title}
          </UIText>
        </View>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={6} style={styles.sectionActionWrap}>
            <UIText variant="caption" color="brand" weight="bold">{action.label}</UIText>
            <Ionicons name="chevron-back" size={12} color={theme.colors.brand[700]} />
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
      <UIText variant="body-sm" color="secondary">{label}</UIText>
      <UIText
        variant="body-sm"
        weight="bold"
        style={{ color: valueColor ?? theme.colors.text.primary }}>
        {value}
      </UIText>
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
  const { t } = useTranslation();
  return (
    <View style={[styles.emptyScreen, { paddingTop: insets.top + 80 }]}>
      <Animated.View
        entering={FadeInDown.duration(420).springify().damping(18)}
        style={styles.emptyIcon}>
        <Ionicons name="cart-outline" size={36} color={theme.colors.brand[600]} />
      </Animated.View>
      <Animated.View
        entering={FadeInDown.duration(380).delay(80)}
        style={styles.emptyTextStack}>
        <UIText variant="sheet-title" align="center" style={styles.emptyTitleNew}>
          {t("checkout.emptyCartTitle")}
        </UIText>
        <UIText variant="body" color="secondary" align="center" style={styles.emptyDescNew}>
          {t("checkout.emptyCartDesc")}
        </UIText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.duration(380).delay(180)}
        style={{ marginTop: 32, alignSelf: "stretch", paddingHorizontal: 32 }}>
        <Button variant="primary" size="lg" fullWidth gradient onPress={onBrowse}>
          <View style={styles.ctaBtnInner}>
            <Text style={styles.ctaBtnText}>{t("checkout.browseBtn")}</Text>
            <Ionicons name="arrow-back" size={16} color="#fff" />
          </View>
        </Button>
      </Animated.View>
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
  const { t } = useTranslation();
  return (
    <View style={[styles.successScreen, { paddingTop: insets.top + 40 }]}>
      <Animated.View
        entering={FadeInDown.duration(460).springify().damping(18)}
        style={styles.successIconWrap}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={34} color={theme.colors.brand[700]} />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(420)}
        style={styles.successHeadingStack}>
        <UIText variant="screen-title" align="center" style={styles.successTitleNew}>
          {t("checkout.orderReceived")}
        </UIText>
        <UIText variant="body" color="secondary" align="center" style={styles.successDescNew}>
          {t("checkout.orderReceivedDesc")}
        </UIText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(180).duration(420)}
        style={styles.successTotalStack}>
        <UIText variant="eyebrow" color="tertiary" align="center">
          {t("checkout.orderTotalLabel")}
        </UIText>
        <UIText variant="metric" align="center" style={styles.successTotalValue}>
          {formatPrice(total)}
        </UIText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(260).duration(420)}
        style={styles.successCard}>
        <View style={styles.successCardRow}>
          <UIText variant="body-sm" color="secondary">{t("checkout.orderNumberLabel")}</UIText>
          <UIText variant="body-sm" weight="extrabold">
            {orderId ? orderId.slice(-8).toUpperCase() : "—"}
          </UIText>
        </View>
        <View style={styles.successCardDivider} />
        <View style={styles.successCardRow}>
          <UIText variant="body-sm" color="secondary">{t("checkout.estimatedDelivery")}</UIText>
          <View style={styles.successEtaPill}>
            <Ionicons name="time-outline" size={12} color={theme.colors.brand[700]} />
            <UIText variant="eyebrow" style={{ color: theme.colors.brand[700] }}>
              30–60 {t("delivery.minUnit")}
            </UIText>
          </View>
        </View>
        <View style={styles.successCardDivider} />
        <View style={styles.successCardRow}>
          <UIText variant="body-sm" color="secondary">{t("checkout.orderStatusLabel")}</UIText>
          <View style={styles.successStatusPill}>
            <View style={styles.successStatusDot} />
            <UIText variant="eyebrow" style={{ color: theme.colors.success.strong }}>
              {t("checkout.preparingStatus")}
            </UIText>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(340).duration(360)}
        style={styles.successTrustRow}>
        <Ionicons name="shield-checkmark" size={12} color={theme.colors.text.tertiary} />
        <UIText variant="eyebrow" color="tertiary">
          {t("checkout.trustSeal")}
        </UIText>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(380).duration(420)}
        style={{
          marginTop: "auto",
          paddingBottom: insets.bottom + 16,
          alignSelf: "stretch",
          paddingHorizontal: 24,
          gap: 10,
        }}>
        <Button variant="primary" size="lg" fullWidth gradient onPress={onViewOrders}>
          <View style={styles.ctaBtnInner}>
            <Text style={styles.ctaBtnText}>{t("checkout.trackOrderBtn")}</Text>
            <Ionicons name="receipt-outline" size={15} color="#fff" />
          </View>
        </Button>
        <Button variant="subtle" size="md" fullWidth onPress={onContinue}>
          {t("checkout.continueShoppingBtn")}
        </Button>
      </Animated.View>
    </View>
  );
}

// ─── Auth Gate Modal ──────────────────────────────────────────────────────────

function AuthGateModal({
  visible,
  onSignIn,
  onDismiss,
}: {
  visible:   boolean;
  onSignIn:  () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  // Pulsing ring animation
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const ring1Op = useSharedValue(0.5);
  const ring2Op = useSharedValue(0.3);

  useEffect(() => {
    if (!visible) return;
    ring1.value = withRepeat(
      withSequence(withTiming(1.35, { duration: 1600 }), withTiming(1, { duration: 1200 })),
      -1, false,
    );
    ring1Op.value = withRepeat(
      withSequence(withTiming(0, { duration: 1600 }), withTiming(0.5, { duration: 1200 })),
      -1, false,
    );
    ring2.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(1.6, { duration: 1800 }), withTiming(1, { duration: 800 })),
      -1, false,
    );
    ring2Op.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 800 }), withTiming(0, { duration: 1800 }), withTiming(0.3, { duration: 800 })),
      -1, false,
    );
  }, [visible, ring1, ring1Op, ring2, ring2Op]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: ring1Op.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: ring2Op.value,
  }));

  // Card entrance
  const cardScale = useSharedValue(0.88);
  const cardOp    = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      cardScale.value = withSpring(1, { damping: 18, stiffness: 280 });
      cardOp.value    = withTiming(1, { duration: 240 });
    } else {
      cardScale.value = 0.88;
      cardOp.value    = 0;
    }
  }, [visible, cardScale, cardOp]);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOp.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
      accessibilityViewIsModal>
      <Pressable style={agStyles.backdrop} onPress={onDismiss}>
        <Animated.View style={[agStyles.card, cardStyle]} onStartShouldSetResponder={() => true}>

          {/* ── Animated rings ── */}
          <View style={agStyles.orbArea}>
            <Animated.View style={[agStyles.ring, agStyles.ring1, ring2Style]} />
            <Animated.View style={[agStyles.ring, agStyles.ring2, ring1Style]} />
            <LinearGradient
              colors={["#1e3a5f", "#0d5c8e", "#0891b2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={agStyles.orb}>
              {/* Inner glow disc */}
              <View style={agStyles.orbInner}>
                <Ionicons name="person-circle" size={42} color="rgba(255,255,255,0.95)" />
              </View>
            </LinearGradient>
          </View>

          {/* ── Copy ── */}
          <Animated.View entering={FadeInDown.delay(120).duration(280)} style={agStyles.copy}>
            <Text style={agStyles.title}>{t("checkout.authGateTitle")}</Text>
            <Text style={agStyles.body}>{t("checkout.authGateBody")}</Text>
          </Animated.View>

          {/* ── Feature pills ── */}
          <Animated.View entering={FadeInDown.delay(200).duration(280)} style={agStyles.pillsRow}>
            {(["flash-outline", "shield-checkmark-outline", "location-outline"] as const).map((icon, i) => (
              <View key={i} style={agStyles.pill}>
                <Ionicons name={icon} size={11} color="#0891b2" />
              </View>
            ))}
          </Animated.View>

          {/* ── CTA ── */}
          <Animated.View entering={FadeInUp.delay(260).duration(280)} style={agStyles.actions}>
            <Pressable
              onPress={onSignIn}
              style={({ pressed }) => [agStyles.signInBtn, pressed && { opacity: 0.9 }]}>
              <LinearGradient
                colors={["#0891b2", "#0db8a8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={agStyles.signInGrad}>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={agStyles.signInText}>{t("checkout.authGateSignIn")}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onDismiss} hitSlop={8} style={agStyles.dismissBtn}>
              <Text style={agStyles.dismissText}>{t("checkout.authGateDismiss")}</Text>
            </Pressable>
          </Animated.View>

        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const agStyles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: "rgba(2, 10, 22, 0.72)",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         28,
  },
  card: {
    width:           "100%",
    maxWidth:        360,
    backgroundColor: "#fff",
    borderRadius:    32,
    paddingTop:      0,
    paddingBottom:   28,
    paddingHorizontal: 24,
    alignItems:      "center",
    overflow:        "hidden",
    shadowColor:     "#021D2E",
    shadowOffset:    { width: 0, height: 20 },
    shadowOpacity:   0.40,
    shadowRadius:    40,
    elevation:       24,
  },

  // Animated orb
  orbArea: {
    marginTop:      36,
    marginBottom:   8,
    width:          110,
    height:         110,
    alignItems:     "center",
    justifyContent: "center",
  },
  ring: {
    position:     "absolute",
    borderRadius: 999,
    borderWidth:  1.5,
  },
  ring1: {
    width:        110,
    height:       110,
    borderColor:  "#0891b2",
  },
  ring2: {
    width:        88,
    height:       88,
    borderColor:  "#0db8a8",
  },
  orb: {
    width:          76,
    height:         76,
    borderRadius:   38,
    alignItems:     "center",
    justifyContent: "center",
  },
  orbInner: {
    width:           68,
    height:          68,
    borderRadius:    34,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
  },

  copy: {
    alignItems: "center",
    gap:        10,
    marginTop:  16,
    marginBottom: 4,
  },
  title: {
    fontFamily:    theme.fonts.black,
    fontSize:      20,
    color:         "#0F172A",
    textAlign:     "center",
    letterSpacing: -0.5,
    lineHeight:    26,
  },
  body: {
    fontFamily: theme.fonts.regular,
    fontSize:   13.5,
    color:      "#64748B",
    textAlign:  "center",
    lineHeight: 20,
    maxWidth:   280,
  },

  pillsRow: {
    flexDirection: "row",
    gap:           8,
    marginTop:     16,
    marginBottom:  4,
  },
  pill: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: "#EFF9FC",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "#BAE6F5",
  },

  actions: {
    width:    "100%",
    gap:      10,
    marginTop: 20,
  },
  signInBtn: {
    borderRadius: 16,
    overflow:     "hidden",
  },
  signInGrad: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               10,
    paddingVertical:   16,
    borderRadius:      16,
  },
  signInText: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         "#fff",
    letterSpacing: -0.3,
  },
  dismissBtn: {
    alignItems:      "center",
    paddingVertical: 10,
  },
  dismissText: {
    fontFamily: theme.fonts.semibold,
    fontSize:   13,
    color:      "#94A3B8",
  },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleNew: {
    letterSpacing: -0.3,
  },
  headerBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.success.bg,
    borderWidth: 1,
    borderColor: theme.colors.success.light,
  },

  // Steps — guided progression bar
  stepBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  stepPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  // Active state — soft brand glow signals "this is where you are"
  stepPillActive: {
    ...theme.shadow.brandGlow,
    shadowOpacity: 0.14,
  },
  stepNum: {
    width:          20,
    height:         20,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
  },
  stepNumText: { fontSize: 11, fontFamily: theme.fonts.black, color: "#fff" },
  stepLabel:   { fontSize: 12, fontFamily: theme.fonts.bold, letterSpacing: 0.2 },
  stepLine:    {
    flex:            1,
    height:          2,
    backgroundColor: theme.colors.slate[200],
    borderRadius:    1,
  },

  // Sign-in required banner — prominent, always above the fold
  signInBanner: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               12,
    backgroundColor:   theme.colors.brand[50],
    borderRadius:      16,
    paddingHorizontal: 14,
    paddingVertical:   14,
    marginBottom:      16,
    borderWidth:       1.5,
    borderColor:       theme.colors.border.brandSoft,
    ...theme.shadow.brandGlow,
    shadowOpacity:     0.08,
  },
  signInBannerIcon: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  signInBannerBtn: {
    backgroundColor:   theme.colors.brand[600],
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   8,
  },

  // Free-delivery banner — refined chip card (no loud gradient)
  freeBanner: {
    borderRadius:    16,
    padding:         14,
    gap:             10,
    marginBottom:    14,
    backgroundColor: theme.colors.amber[50],
    borderWidth:     1,
    borderColor:     "rgba(245,158,11,0.18)",
  },
  freeBannerHead: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
  },
  freeBannerIcon: {
    width:           30,
    height:          30,
    borderRadius:    10,
    backgroundColor: theme.colors.amber[100],
    alignItems:      "center",
    justifyContent:  "center",
  },
  freeBannerTitleNew: {
    color:      theme.colors.amber[900],
    fontFamily: theme.fonts.semibold,
    marginTop:  2,
  },
  freeBarTrack: {
    height:          4,
    borderRadius:    2,
    backgroundColor: "rgba(245,158,11,0.18)",
    overflow:        "hidden",
  },
  freeBarFill: {
    height:          "100%",
    backgroundColor: theme.colors.amber[500],
    borderRadius:    2,
  },

  // Section — clinical elevated card (no double border + shadow stack)
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    marginBottom:    14,
    ...theme.shadow.card,
  },
  sectionHead: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    justifyContent:"space-between",
    paddingHorizontal: 16,
    paddingTop:        14,
    paddingBottom:     6,
  },
  sectionTitleWrap: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
  },
  sectionIcon: {
    width:           30,
    height:          30,
    borderRadius:    10,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  sectionTitleNew: {
    letterSpacing: -0.2,
  },
  sectionActionWrap: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           2,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingTop:        4,
    paddingBottom:     16,
    gap:               10,
  },

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

  // Branch section
  branchHint: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "right",
    marginBottom: 4,
  },
  branchWarning: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.amber[50],
    borderWidth: 1,
    borderColor: theme.colors.amber[100],
    marginTop: 6,
  },
  branchWarningText: {
    flex: 1,
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.amber[800],
    textAlign: "right",
    lineHeight: 16,
  },
  savedHint: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "right",
    lineHeight: 18,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginBottom: 14,
  },
  savedMetaRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
  },
  savedMetaLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[500],
    textAlign: "right",
  },
  savedMetaValue: {
    fontSize: 12,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
    textAlign: "right",
    flex: 1,
  },
  savedHelp: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "right",
    lineHeight: 18,
  },
  savedAddressBanner: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    marginBottom: 16,
  },
  savedAddressTitle: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    textAlign: "right",
    marginBottom: 4,
  },
  savedAddressText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "right",
    lineHeight: 18,
    marginBottom: 10,
  },
  savedAddressSummary: {
    fontSize: 12,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text.primary,
    textAlign: "right",
    marginBottom: 12,
  },
  etaPillInline: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 5,
    backgroundColor: theme.colors.brand[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
  },
  etaPillText: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.brand[700] },

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

  // Premium payment cards (DetailsStep PaymentMethodCards)
  payCardsWrapper: {
    gap: 10,
  },
  payCard: {
    borderRadius:    16,
    borderWidth:     1.5,
    borderColor:     theme.colors.border.default,
    backgroundColor: theme.colors.surface,
    overflow:        "hidden",
  },
  payCardBadge: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             4,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderBottomWidth: 1,
  },
  payCardBadgeText: {
    fontSize:   9,
    fontFamily: theme.fonts.black,
    letterSpacing: 0.4,
    textAlign: "right",
  },
  payCardRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    gap:            12,
    paddingHorizontal: 14,
    paddingVertical:   14,
  },
  payCardMeta: {
    flex:           1,
    flexDirection:  "row-reverse",
    alignItems:     "center",
    gap:            12,
  },
  payCardIcon: {
    width:           44,
    height:          44,
    borderRadius:    13,
    alignItems:      "center",
    justifyContent:  "center",
  },
  payCardTextBlock: {
    flex:    1,
    gap:     2,
  },
  payCardTitle: {
    fontSize:   13,
    fontFamily: theme.fonts.bold,
    color:      theme.colors.text.primary,
    textAlign:  "right",
  },
  payCardSub: {
    fontSize:   11,
    fontFamily: theme.fonts.regular,
    color:      theme.colors.slate[400],
    textAlign:  "right",
  },
  payCardCheck: {
    width:           22,
    height:          22,
    borderRadius:    11,
    borderWidth:     2,
    borderColor:     theme.colors.slate[300],
    alignItems:      "center",
    justifyContent:  "center",
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

  // Summary — refined financial rhythm
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent:"space-between",
    paddingVertical: 5,
  },
  summaryLabel: { fontSize: 12, fontFamily: theme.fonts.semibold, color: theme.colors.text.secondary },
  summaryValue: { fontSize: 12, fontFamily: theme.fonts.bold,     color: theme.colors.text.primary },
  summaryDivider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  10,
  },
  summaryTotalRow: {
    flexDirection:  "row-reverse",
    justifyContent: "space-between",
    alignItems:     "baseline",
  },
  summaryTotalLabel: {
    fontSize:   14,
    fontFamily: theme.fonts.extrabold,
    color:      theme.colors.text.primary,
    letterSpacing: -0.2,
  },
  summaryTotalValue: {
    fontSize:      22,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.brand[700],
    letterSpacing: -0.5,
  },
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

  // CTA bar — premium anchor (upward shadow, tightly stacked)
  cta: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: theme.colors.surface,
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  theme.colors.border.hairline,
    paddingHorizontal: 16,
    paddingTop:        14,
    gap:               12,
    // Subtle upward lift — not a billboard shadow
    shadowColor:   "#0C2240",
    shadowOffset:  { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius:  12,
    elevation:     8,
  },
  ctaTotals: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  ctaTotalValueNew: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.6,
    marginTop:     2,
  },
  ctaCount: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             6,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      999,
  },
  ctaBtnInner: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  ctaBtnText: { fontSize: 15, fontFamily: theme.fonts.black, color: "#fff", letterSpacing: -0.2 },

  // Empty cart — premium empty state
  emptyScreen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width:           96,
    height:          96,
    borderRadius:    28,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    20,
    ...theme.shadow.brandGlow,
    shadowOpacity:   0.12,
  },
  emptyTextStack: {
    alignItems: "center",
    gap:        8,
    maxWidth:   320,
  },
  emptyTitleNew: {
    letterSpacing: -0.4,
  },
  emptyDescNew: {
    lineHeight: 22,
  },

  // Success — clinical confirmation (NOT loud green)
  successScreen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconWrap: {
    marginBottom: 24,
  },
  successIcon: {
    width:           80,
    height:          80,
    borderRadius:    26,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.brandGlow,
  },
  successHeadingStack: {
    alignItems: "center",
    gap:        8,
    maxWidth:   340,
  },
  successTitleNew: {
    letterSpacing: -0.5,
  },
  successDescNew: {
    lineHeight: 22,
  },
  // Metric stack — the biggest number on the screen
  successTotalStack: {
    alignItems: "center",
    marginTop:  28,
    gap:        4,
  },
  successTotalValue: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.8,
  },
  // Metadata card — clean, dividers, no heavy border
  successCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    padding:         18,
    marginTop:       28,
    alignSelf:       "stretch",
    ...theme.shadow.card,
  },
  successCardRow: {
    flexDirection: "row-reverse",
    justifyContent:"space-between",
    alignItems:    "center",
  },
  successCardDivider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  12,
  },
  successEtaPill: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             6,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
  },
  successStatusPill: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             6,
    backgroundColor: theme.colors.success.bg,
    borderWidth:     1,
    borderColor:     theme.colors.success.light,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
  },
  successStatusDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: theme.colors.success.base,
  },
  successTrustRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           6,
    marginTop:     16,
  },
});
