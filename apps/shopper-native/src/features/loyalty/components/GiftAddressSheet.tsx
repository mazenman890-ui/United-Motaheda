/**
 * GiftAddressSheet — full address capture for gift redemption.
 *
 * Two modes:
 *   1. Saved address picker — shows the user's saved addresses and lets
 *      them select one as the delivery target.
 *   2. New address form     — React Hook Form + zod with Arabic validation
 *      messages, phone + governorate/city support, and delivery notes.
 *
 * Once an address is confirmed, onConfirm is called with a RedemptionAddress.
 * The caller (GiftCatalogScreen) owns the redeem mutation.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { useAuth } from "@/features/auth/context";
import { useAddressStore } from "@/features/addresses";
import type { Address, AddressFormData } from "@/features/addresses";
import type { RedemptionAddress } from "../types";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
type TFunc = ReturnType<typeof useTranslation>["t"];

// ─── Egyptian governorates ────────────────────────────────────────────────────

const GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحيرة",
  "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا",
  "القليوبية", "الوادي الجديد", "السويس", "أسوان", "أسيوط",
  "بني سويف", "بورسعيد", "دمياط", "الشرقية", "جنوب سيناء",
  "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء",
  "سوهاج", "البحر الأحمر",
];

// ─── Zod schema with Arabic messages ─────────────────────────────────────────

const addressSchema = z.object({
  recipientName: z
    .string()
    .min(1, "الاسم مطلوب")
    .min(2, "الاسم يجب أن يكون حرفين على الأقل")
    .max(60, "الاسم طويل جداً"),
  phone: z
    .string()
    .min(1, "رقم الهاتف مطلوب")
    .regex(/^(\+20|0020|0)?1[0-2,5]{1}[0-9]{8}$/, "رقم الهاتف غير صحيح، مثال: 01xxxxxxxxx"),
  governorate: z
    .string()
    .min(1, "المحافظة مطلوبة"),
  city: z
    .string()
    .min(1, "المدينة مطلوبة")
    .min(2, "المدينة يجب أن تكون حرفين على الأقل"),
  street: z
    .string()
    .min(1, "الشارع مطلوب")
    .min(3, "عنوان الشارع قصير جداً"),
  building: z
    .string()
    .min(1, "رقم المبنى مطلوب"),
  floor: z.string().optional(),
  notes: z
    .string()
    .max(200, "الملاحظات طويلة جداً")
    .optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAddrLabel(label: string, t: TFunc): string {
  switch (label) {
    case "home":   return t("address.labelHome");
    case "work":   return t("address.labelWork");
    case "family": return t("address.labelFamily");
    default:       return t("address.labelOther");
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GiftAddressSheetProps {
  visible:    boolean;
  giftName:   string;
  pointsCost: number;
  submitting: boolean;
  onConfirm:  (address: RedemptionAddress) => void;
  onClose:    () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

type SheetMode = "picker" | "form";

export function GiftAddressSheet({
  visible,
  giftName,
  pointsCost,
  submitting,
  onConfirm,
  onClose,
}: GiftAddressSheetProps) {
  const insets      = useSafeAreaInsets();
  const { user }    = useAuth();
  const { t }       = useTranslation();
  const addresses   = useAddressStore((s) => s.addresses);
  const loading     = useAddressStore((s) => s.loading);
  const fetch       = useAddressStore((s) => s.fetch);
  const addAddress  = useAddressStore((s) => s.add);

  const [mode, setMode]               = useState<SheetMode>("picker");
  const [govDropdown, setGovDropdown] = useState(false);

  // Load saved addresses when sheet opens
  useEffect(() => {
    if (visible && user?.id) {
      fetch(user.id).catch(() => {});
    }
    if (visible) {
      setMode("picker");
      setGovDropdown(false);
    }
  }, [visible, user?.id, fetch]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasSaved = addresses.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.sheet, { paddingTop: insets.top + 8 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={18} color={theme.colors.slate[600]} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <UIText style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {t("loyalty.addressSheetTitle")}
              </UIText>
              <UIText style={styles.headerSub} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                {t("loyalty.addressSheetSub", {
                  gift:   giftName,
                  points: pointsCost.toLocaleString("ar-EG"),
                })}
              </UIText>
            </View>
          </View>

          {/* Mode selector — only shown when there are saved addresses */}
          {hasSaved && (
            <View style={styles.modeRow}>
              <ModeTab
                label={t("loyalty.savedAddresses")}
                active={mode === "picker"}
                onPress={() => setMode("picker")}
              />
              <ModeTab
                label={t("loyalty.newAddress")}
                active={mode === "form"}
                onPress={() => setMode("form")}
              />
            </View>
          )}

          {/* Content */}
          {(!hasSaved || mode === "form") ? (
            <AddressForm
              onConfirm={onConfirm}
              submitting={submitting}
              insets={insets}
              govDropdown={govDropdown}
              setGovDropdown={setGovDropdown}
              userId={user?.id}
              hasSavedAddresses={hasSaved}
              addAddress={addAddress}
            />
          ) : (
            <SavedAddressPicker
              addresses={addresses}
              loading={loading}
              onSelect={onConfirm}
              onAddNew={() => setMode("form")}
              submitting={submitting}
              insets={insets}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Mode tab ────────────────────────────────────────────────────────────────

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.modeTab, active && styles.modeTabActive]}
    >
      <UIText style={[styles.modeTabText, active && styles.modeTabTextActive]} maxFontSizeMultiplier={1.3}>
        {label}
      </UIText>
    </Pressable>
  );
}

// ─── Saved address picker ─────────────────────────────────────────────────────

interface SavedAddressPickerProps {
  addresses:  Address[];
  loading:    boolean;
  onSelect:   (addr: RedemptionAddress) => void;
  onAddNew:   () => void;
  submitting: boolean;
  insets:     { bottom: number };
}

function SavedAddressPicker({
  addresses, loading, onSelect, onAddNew, submitting, insets,
}: SavedAddressPickerProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(
    addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null,
  );

  useEffect(() => {
    const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0];
    if (defaultAddr) setSelectedId(defaultAddr.id);
  }, [addresses]);

  const handleConfirm = useCallback(() => {
    const addr = addresses.find((a) => a.id === selectedId);
    if (!addr) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSelect({
      name:        addr.recipient_name,
      phone:       addr.phone,
      governorate: addr.city,
      city:        addr.district || addr.city,
      district:    addr.district || undefined,
      street:      addr.street,
      building:    addr.building,
      floor:       addr.floor,
      apartment:   addr.apartment,
      notes:       addr.landmark,
    });
  }, [addresses, selectedId, onSelect]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <UIText style={styles.loadingText}>{t("loyalty.loadingAddresses")}</UIText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {addresses.map((addr) => (
          <Pressable
            key={addr.id}
            onPress={() => setSelectedId(addr.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedId === addr.id }}
            accessibilityLabel={t("loyalty.addrA11y", {
              label: getAddrLabel(addr.label, t),
              name:  addr.recipient_name,
              city:  addr.city,
            })}
            style={({ pressed }) => [
              styles.addrCard,
              selectedId === addr.id && styles.addrCardSelected,
              pressed && { opacity: 0.88 },
            ]}
          >
            <View style={styles.addrCardLeft}>
              <Ionicons
                name={selectedId === addr.id ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={selectedId === addr.id ? theme.colors.brand[600] : theme.colors.slate[300]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.addrCardHead}>
                <UIText style={styles.addrName} maxFontSizeMultiplier={1.3}>{addr.recipient_name}</UIText>
                <View style={styles.addrLabelPill}>
                  <UIText style={styles.addrLabelText} maxFontSizeMultiplier={1.2}>
                    {getAddrLabel(addr.label, t)}
                  </UIText>
                </View>
              </View>
              <UIText style={styles.addrLine} maxFontSizeMultiplier={1.4} numberOfLines={2}>
                {addr.city}، {addr.district}، {addr.street}
                {addr.building ? `، مبنى ${addr.building}` : ""}
                {addr.floor ? `، طابق ${addr.floor}` : ""}
              </UIText>
              <UIText style={styles.addrPhone} maxFontSizeMultiplier={1.3}>{addr.phone}</UIText>
            </View>
          </Pressable>
        ))}

        <Pressable
          onPress={onAddNew}
          accessibilityRole="button"
          accessibilityLabel={t("loyalty.addNewAddress")}
          style={({ pressed }) => [styles.addNewBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="add-circle-outline" size={16} color={theme.colors.brand[700]} />
          <UIText style={styles.addNewText}>{t("loyalty.addNewAddress")}</UIText>
        </Pressable>
      </ScrollView>

      <View style={[styles.confirmFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={handleConfirm}
          disabled={!selectedId || submitting}
          accessibilityRole="button"
          accessibilityLabel={t("loyalty.confirmAddressA11y")}
          accessibilityState={{ disabled: !selectedId || submitting, busy: submitting }}
          style={({ pressed }) => [
            styles.confirmBtn,
            (!selectedId || submitting) && styles.confirmBtnDisabled,
            pressed && selectedId && !submitting && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="gift-outline" size={16} color="#fff" />
          <UIText style={styles.confirmBtnText} maxFontSizeMultiplier={1.2}>
            {submitting ? t("loyalty.confirmAddressSending") : t("loyalty.confirmOrderLabel")}
          </UIText>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Address form ─────────────────────────────────────────────────────────────

interface AddressFormProps {
  onConfirm:      (addr: RedemptionAddress) => void;
  submitting:     boolean;
  insets:         { bottom: number };
  govDropdown:    boolean;
  setGovDropdown: (v: boolean) => void;
  userId?:        string;
  hasSavedAddresses: boolean;
  addAddress:     (userId: string, form: AddressFormData) => Promise<Address>;
}

function AddressForm({
  onConfirm,
  submitting,
  insets,
  govDropdown,
  setGovDropdown,
  userId,
  hasSavedAddresses,
  addAddress,
}: AddressFormProps) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      recipientName: "",
      phone:         "",
      governorate:   "",
      city:          "",
      street:        "",
      building:      "",
      floor:         "",
      notes:         "",
    },
  });

  const watchedGov = watch("governorate");

  const [saveToProfile, setSaveToProfile] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<AddressFormValues> = useCallback(
    async (values) => {
      setSaveError(null);

      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      if (saveToProfile && userId) {
        const payload: AddressFormData = {
          label:          "home",
          recipient_name: values.recipientName,
          phone:          values.phone,
          city:           values.governorate,
          district:       values.city,
          street:         values.street,
          building:       values.building,
          floor:          values.floor?.trim() || "",
          apartment:      "",
          landmark:       values.notes?.trim() || "",
          lat:            undefined,
          lng:            undefined,
          is_default:     !hasSavedAddresses,
        };
        try {
          await addAddress(userId, payload);
        } catch {
          setSaveError(t("loyalty.addressSaveError"));
        }
      }

      onConfirm({
        name:        values.recipientName,
        phone:       values.phone,
        governorate: values.governorate,
        city:        values.city,
        street:      values.street,
        building:    values.building || undefined,
        floor:       values.floor?.trim() || undefined,
        notes:       values.notes?.trim() || undefined,
      });
    },
    [addAddress, hasSavedAddresses, onConfirm, saveToProfile, userId, t],
  );

  const onError = useCallback(() => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipient name */}
        <Animated.View entering={FadeInDown.delay(40).duration(200)}>
          <Controller
            control={control}
            name="recipientName"
            render={({ field }) => (
              <FormField
                label={t("loyalty.recipientName")}
                placeholder="الاسم كامل"
                icon="person-outline"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.recipientName?.message}
              />
            )}
          />
        </Animated.View>

        {/* Phone */}
        <Animated.View entering={FadeInDown.delay(70).duration(200)}>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <FormField
                label={t("loyalty.phoneField")}
                placeholder="01xxxxxxxxx"
                icon="call-outline"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.phone?.message}
              />
            )}
          />
        </Animated.View>

        {/* Governorate picker */}
        <Animated.View entering={FadeInDown.delay(100).duration(200)}>
          <UIText style={styles.fieldLabel}>{t("loyalty.governorateField")}</UIText>
          <Pressable
            onPress={() => setGovDropdown(!govDropdown)}
            accessibilityRole="combobox"
            accessibilityLabel={t("loyalty.chooseGovernorateA11y")}
            accessibilityState={{ expanded: govDropdown }}
            style={[
              styles.fieldBox,
              errors.governorate && styles.fieldBoxError,
            ]}
          >
            <Ionicons
              name={govDropdown ? "chevron-up" : "chevron-down"}
              size={14}
              color={theme.colors.slate[400]}
            />
            <UIText
              style={[
                styles.fieldInput,
                !watchedGov && { color: theme.colors.slate[300] },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              {watchedGov || t("loyalty.selectGovernorate")}
            </UIText>
          </Pressable>
          {errors.governorate && (
            <UIText style={styles.fieldError}>{errors.governorate.message}</UIText>
          )}
          {govDropdown && (
            <View style={styles.dropdown}>
              <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                {GOVERNORATES.map((gov) => (
                  <Pressable
                    key={gov}
                    onPress={() => {
                      setValue("governorate", gov, { shouldValidate: true });
                      setGovDropdown(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: watchedGov === gov }}
                    style={[styles.dropdownItem, watchedGov === gov && styles.dropdownItemActive]}
                  >
                    <UIText
                      style={[styles.dropdownItemText, watchedGov === gov && styles.dropdownItemTextActive]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {gov}
                    </UIText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>

        {/* City */}
        <Animated.View entering={FadeInDown.delay(130).duration(200)}>
          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <FormField
                label={t("loyalty.cityField")}
                placeholder="مثال: مدينة نصر"
                icon="location-outline"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.city?.message}
              />
            )}
          />
        </Animated.View>

        {/* Street */}
        <Animated.View entering={FadeInDown.delay(160).duration(200)}>
          <Controller
            control={control}
            name="street"
            render={({ field }) => (
              <FormField
                label={t("loyalty.streetField")}
                placeholder="اسم أو رقم الشارع"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.street?.message}
              />
            )}
          />
        </Animated.View>

        {/* Building + Floor row */}
        <Animated.View entering={FadeInDown.delay(190).duration(200)} style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="building"
              render={({ field }) => (
                <FormField
                  label={t("loyalty.buildingField")}
                  placeholder="مثال: 12"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.building?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="floor"
              render={({ field }) => (
                <FormField
                  label={t("loyalty.floorField")}
                  placeholder="مثال: 3"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </View>
        </Animated.View>

        {/* Delivery notes */}
        <Animated.View entering={FadeInDown.delay(220).duration(200)}>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <FormField
                label={t("loyalty.notesField")}
                placeholder="بجوار مسجد، أمام حديقة…"
                icon="chatbubble-outline"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.notes?.message}
                multiline
              />
            )}
          />
        </Animated.View>

        {/* Save toggle */}
        <Animated.View entering={FadeInDown.delay(250).duration(200)}>
          <Pressable
            onPress={() => setSaveToProfile((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: saveToProfile }}
            style={({ pressed }) => [
              styles.saveRow,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons
              name={saveToProfile ? "checkbox" : "square-outline"}
              size={18}
              color={saveToProfile ? theme.colors.brand[600] : theme.colors.slate[400]}
            />
            <UIText style={styles.saveRowText} maxFontSizeMultiplier={1.3}>
              {t("loyalty.saveToProfile")}
            </UIText>
          </Pressable>
          {saveError && (
            <UIText style={styles.saveWarn} accessibilityRole="alert" maxFontSizeMultiplier={1.4}>
              {saveError}
            </UIText>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.confirmFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={handleSubmit(onSubmit, onError)}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={t("loyalty.confirmAddressA11y")}
          accessibilityState={{ disabled: submitting, busy: submitting }}
          style={({ pressed }) => [
            styles.confirmBtn,
            submitting && styles.confirmBtnDisabled,
            pressed && !submitting && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="gift-outline" size={16} color="#fff" />
          <UIText style={styles.confirmBtnText} maxFontSizeMultiplier={1.2}>
            {submitting ? t("loyalty.confirmAddressSending") : t("loyalty.confirmOrderLabel")}
          </UIText>
        </Pressable>
      </View>
    </View>
  );
}

// ─── FormField atom ───────────────────────────────────────────────────────────

interface FormFieldProps {
  label:          string;
  placeholder?:   string;
  icon?:          IoniconsName;
  value:          string;
  onChangeText:   (v: string) => void;
  onBlur?:        () => void;
  error?:         string;
  keyboardType?:  "default" | "phone-pad" | "numeric";
  multiline?:     boolean;
}

function FormField({
  label, placeholder, icon, value, onChangeText, onBlur, error, keyboardType, multiline,
}: FormFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <UIText style={styles.fieldLabel}>{label}</UIText>
      <View style={[styles.fieldBox, error && styles.fieldBoxError, multiline && { minHeight: 72, alignItems: "flex-start" }]}>
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={theme.colors.slate[400]}
            style={{ marginStart: 4, marginTop: multiline ? 14 : 0 }}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.slate[300]}
          keyboardType={keyboardType ?? "default"}
          textAlign={textAlignStart(isRtl()) as "left" | "right"}
          multiline={multiline}
          style={[styles.fieldInput, multiline && { paddingTop: 12, textAlignVertical: "top" }]}
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={label}
        />
      </View>
      {error && <UIText style={styles.fieldError} accessibilityRole="alert">{error}</UIText>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: 16,
    paddingBottom:     12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  closeBtn: {
    width:          36,
    height:         36,
    borderRadius:   12,
    backgroundColor: theme.colors.subtle,
    alignItems:     "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
    color:      theme.colors.text.primary,
    textAlign:  textAlignStart(isRtl()),
  },
  headerSub: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  textAlignStart(isRtl()),
    marginTop:  2,
  },

  modeRow: {
    flexDirection:     flexRow(isRtl()),
    paddingHorizontal: 16,
    paddingTop:        10,
    paddingBottom:     2,
    gap:               6,
  },
  modeTab: {
    flex:              1,
    paddingVertical:   9,
    borderRadius:      10,
    alignItems:        "center",
    backgroundColor:   theme.colors.subtle,
    borderWidth:       1,
    borderColor:       theme.colors.border.default,
  },
  modeTabActive: {
    backgroundColor: theme.colors.brand.lighter,
    borderColor:     theme.colors.brand[200],
  },
  modeTabText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.text.secondary,
  },
  modeTabTextActive: {
    color: theme.colors.brand[700],
  },

  centered: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      theme.colors.text.tertiary,
  },

  // Saved address picker
  addrCard: {
    flexDirection:   flexRow(isRtl()),
    gap:             10,
    backgroundColor: theme.colors.surface,
    borderRadius:    14,
    padding:         14,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    ...theme.shadow.hairline,
  },
  addrCardSelected: {
    borderColor:     theme.colors.brand[300],
    backgroundColor: theme.colors.brand[50],
  },
  addrCardLeft: {
    paddingTop: 2,
  },
  addrCardHead: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    gap:            6,
    marginBottom:   4,
  },
  addrName: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    flex:       1,
    textAlign:  textAlignStart(isRtl()),
  },
  addrLabelPill: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      6,
    backgroundColor:   theme.colors.surfaceSunken,
  },
  addrLabelText: {
    fontFamily: theme.fonts.bold,
    fontSize:   9,
    color:      theme.colors.text.secondary,
  },
  addrLine: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    textAlign:  textAlignStart(isRtl()),
    lineHeight: 17,
  },
  addrPhone: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  textAlignStart(isRtl()),
    marginTop:  4,
    letterSpacing: 0.5,
  },

  addNewBtn: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    paddingVertical:   12,
    paddingHorizontal: 14,
    borderRadius:      14,
    borderWidth:       1.5,
    borderColor:       theme.colors.brand[200],
    borderStyle:       "dashed",
    backgroundColor:   theme.colors.brand[50],
    justifyContent:    "center",
    marginTop:         4,
  },
  addNewText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand[700],
  },

  // Form fields
  fieldWrap: {
    gap: 4,
  },
  fieldRow: {
    flexDirection: flexRow(isRtl()),
    gap:           10,
  },
  fieldLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.text.secondary,
    textAlign:  textAlignStart(isRtl()),
    paddingEnd: 2,
  },
  fieldBox: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    backgroundColor:   theme.colors.surface,
    borderRadius:      14,
    borderWidth:       1.5,
    borderColor:       theme.colors.border.default,
    paddingHorizontal: 12,
    minHeight:         46,
  },
  fieldBoxError: {
    borderColor:     theme.colors.red[400],
    backgroundColor: theme.colors.red[50],
  },
  fieldInput: {
    flex:       1,
    fontFamily: theme.fonts.semibold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    paddingVertical: 10,
  },
  fieldError: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      theme.colors.red[500],
    textAlign:  textAlignStart(isRtl()),
    paddingEnd: 4,
  },

  saveRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               8,
    paddingVertical:   10,
    paddingHorizontal: 12,
    borderRadius:      14,
    backgroundColor:   theme.colors.surfaceSunken,
    borderWidth:       1,
    borderColor:       theme.colors.border.default,
  },
  saveRowText: {
    flex:       1,
    fontFamily: theme.fonts.semibold,
    fontSize:   12,
    color:      theme.colors.text.primary,
    textAlign:  textAlignStart(isRtl()),
  },
  saveWarn: {
    marginTop:  6,
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.warning.strong,
    textAlign:  textAlignStart(isRtl()),
    paddingEnd: 4,
    lineHeight: 16,
  },

  // Governorate dropdown
  dropdown: {
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    backgroundColor: theme.colors.surface,
    marginTop:       4,
    overflow:        "hidden",
    ...theme.shadow.card,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical:   11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  dropdownItemActive: {
    backgroundColor: theme.colors.brand[50],
  },
  dropdownItemText: {
    fontFamily: theme.fonts.semibold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    textAlign:  textAlignStart(isRtl()),
  },
  dropdownItemTextActive: {
    color:      theme.colors.brand[700],
    fontFamily: theme.fonts.black,
  },

  // Footer confirm
  confirmFooter: {
    paddingHorizontal: 16,
    paddingTop:        10,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    theme.colors.border.hairline,
    backgroundColor:   theme.colors.bg,
  },
  confirmBtn: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "center",
    gap:               8,
    backgroundColor:   theme.colors.brand[600],
    borderRadius:      16,
    paddingVertical:   15,
    ...theme.shadow.brand,
  },
  confirmBtnDisabled: {
    backgroundColor: theme.colors.subtle,
  },
  confirmBtnText: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      "#fff",
  },
});

export default GiftAddressSheet;
