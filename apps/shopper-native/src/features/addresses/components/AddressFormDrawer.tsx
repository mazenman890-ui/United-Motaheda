import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, SlideInRight } from "react-native-reanimated";
import { AddressMapPlaceholder } from "./AddressMapPlaceholder";
import { ADDRESS_LABELS } from "../types";
import type { Address, AddressFormData, AddressLabel } from "../types";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface Props {
  visible: boolean;
  address?: Address | null;
  onClose: () => void;
  onSubmit: (data: AddressFormData) => void;
  loading?: boolean;
}

const EMPTY_FORM: AddressFormData = {
  label: "home",
  recipient_name: "",
  phone: "",
  city: "",
  district: "",
  street: "",
  building: "",
  floor: "",
  apartment: "",
  landmark: "",
  is_default: false,
};

export function AddressFormDrawer({ visible, address, onClose, onSubmit, loading }: Props) {
  const insets = useSafeAreaInsets();
  const isEdit = !!address;

  const [form, setForm] = useState<AddressFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  useEffect(() => {
    if (visible) {
      if (address) {
        setForm({
          label: address.label,
          recipient_name: address.recipient_name,
          phone: address.phone,
          city: address.city,
          district: address.district,
          street: address.street,
          building: address.building,
          floor: address.floor ?? "",
          apartment: address.apartment ?? "",
          landmark: address.landmark ?? "",
          is_default: address.is_default,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [visible, address]);

  const updateField = useCallback((key: keyof AddressFormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.recipient_name.trim()) e.recipient_name = "مطلوب";
    if (!form.phone.trim()) e.phone = "مطلوب";
    if (!form.city.trim()) e.city = "مطلوب";
    if (!form.district.trim()) e.district = "مطلوب";
    if (!form.street.trim()) e.street = "مطلوب";
    if (!form.building.trim()) e.building = "مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSubmit(form);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={18} color={theme.colors.slate[600]} />
            </Pressable>
            <Text style={styles.headerTitle}>
              {isEdit ? "تعديل العنوان" : "إضافة عنوان جديد"}
            </Text>
            <View style={{ width: 36 }} />
          </Animated.View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled">

            {/* Map placeholder */}
            <Animated.View entering={FadeInDown.duration(280).delay(50)}>
              <AddressMapPlaceholder lat={address?.lat} lng={address?.lng} />
              <View style={styles.mapHint}>
                <Ionicons name="navigate-outline" size={12} color={theme.colors.brand[600]} />
                <Text style={styles.mapHintText}>سيتم تحديد الموقع تلقائياً عند التوصيل</Text>
              </View>
            </Animated.View>

            {/* Label selector */}
            <Animated.View entering={FadeInDown.duration(280).delay(100)} style={styles.section}>
              <Text style={styles.sectionTitle}>نوع العنوان</Text>
              <View style={styles.labelGrid}>
                {ADDRESS_LABELS.map((l) => {
                  const active = form.label === l.key;
                  return (
                    <Pressable
                      key={l.key}
                      onPress={() => updateField("label", l.key)}
                      style={[styles.labelChip, active && styles.labelChipActive]}>
                      <Ionicons
                        name={l.icon as IoniconsName}
                        size={16}
                        color={active ? theme.colors.brand[700] : theme.colors.slate[400]}
                      />
                      <Text style={[styles.labelChipText, active && styles.labelChipTextActive]}>
                        {l.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Recipient info */}
            <Animated.View entering={FadeInDown.duration(280).delay(150)} style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات المستلم</Text>
              <View style={styles.fieldGroup}>
                <FormField
                  label="اسم المستلم"
                  value={form.recipient_name}
                  onChange={(v) => updateField("recipient_name", v)}
                  error={errors.recipient_name}
                  placeholder="الاسم بالكامل"
                  icon="person-outline"
                />
                <FormField
                  label="رقم الهاتف"
                  value={form.phone}
                  onChange={(v) => updateField("phone", v)}
                  error={errors.phone}
                  placeholder="05XXXXXXXX"
                  icon="call-outline"
                  keyboardType="phone-pad"
                />
              </View>
            </Animated.View>

            {/* Address details */}
            <Animated.View entering={FadeInDown.duration(280).delay(200)} style={styles.section}>
              <Text style={styles.sectionTitle}>تفاصيل العنوان</Text>
              <View style={styles.fieldGroup}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="المدينة"
                      value={form.city}
                      onChange={(v) => updateField("city", v)}
                      error={errors.city}
                      placeholder="مثال: الرياض"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="الحي"
                      value={form.district}
                      onChange={(v) => updateField("district", v)}
                      error={errors.district}
                      placeholder="مثال: النرجس"
                    />
                  </View>
                </View>
                <FormField
                  label="الشارع"
                  value={form.street}
                  onChange={(v) => updateField("street", v)}
                  error={errors.street}
                  placeholder="اسم أو رقم الشارع"
                />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="المبنى"
                      value={form.building}
                      onChange={(v) => updateField("building", v)}
                      error={errors.building}
                      placeholder="رقم المبنى"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="الطابق"
                      value={form.floor ?? ""}
                      onChange={(v) => updateField("floor", v)}
                      placeholder="اختياري"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="الشقة"
                      value={form.apartment ?? ""}
                      onChange={(v) => updateField("apartment", v)}
                      placeholder="اختياري"
                    />
                  </View>
                </View>
                <FormField
                  label="علامة مميزة"
                  value={form.landmark ?? ""}
                  onChange={(v) => updateField("landmark", v)}
                  placeholder="بجوار مسجد / مقابل حديقة…"
                  icon="flag-outline"
                />
              </View>
            </Animated.View>

            {/* Default toggle */}
            <Animated.View entering={FadeInDown.duration(280).delay(250)}>
              <Pressable
                onPress={() => updateField("is_default", !form.is_default)}
                style={[styles.toggleRow, form.is_default && styles.toggleRowActive]}>
                <View style={styles.toggleLeft}>
                  <Ionicons
                    name={form.is_default ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={form.is_default ? theme.colors.brand[600] : theme.colors.slate[300]}
                  />
                  <View>
                    <Text style={styles.toggleTitle}>تعيين كعنوان افتراضي</Text>
                    <Text style={styles.toggleDesc}>سيُستخدم تلقائياً عند الطلب</Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>

            {/* Submit button */}
            <Animated.View entering={FadeInDown.duration(280).delay(300)}>
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}>
                {loading ? (
                  <Text style={styles.submitText}>جاري الحفظ...</Text>
                ) : (
                  <>
                    <Ionicons name={isEdit ? "checkmark" : "add"} size={18} color="#fff" />
                    <Text style={styles.submitText}>
                      {isEdit ? "حفظ التعديلات" : "إضافة العنوان"}
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Form Field Component ────────────────────────────────────────────────────

function FormField({
  label,
  value,
  onChange,
  error,
  placeholder,
  icon,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  icon?: IoniconsName;
  keyboardType?: "default" | "phone-pad" | "email-address" | "numeric";
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputWrap, error && fieldStyles.inputError]}>
        {icon && (
          <Ionicons name={icon} size={14} color={theme.colors.slate[400]} style={{ marginLeft: 8 }} />
        )}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.slate[300]}
          keyboardType={keyboardType ?? "default"}
          style={fieldStyles.input}
          textAlign="right"
        />
      </View>
      {error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.slate[50],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  mapHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  mapHintText: {
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.brand[600],
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
    textAlign: "right",
  },
  fieldGroup: {
    gap: 12,
  },
  row: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  labelGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  labelChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
  },
  labelChipActive: {
    backgroundColor: theme.colors.brand[50],
    borderColor: theme.colors.brand[200],
  },
  labelChipText: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[500],
  },
  labelChipTextActive: {
    color: theme.colors.brand[700],
    fontFamily: theme.fonts.black,
  },
  toggleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
  },
  toggleRowActive: {
    backgroundColor: theme.colors.brand[50],
    borderColor: theme.colors.brand[200],
  },
  toggleLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  toggleTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    textAlign: "right",
  },
  toggleDesc: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[400],
    textAlign: "right",
  },
  submitBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.brand[600],
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 8,
    ...theme.shadow.brand,
  },
  submitText: {
    fontSize: 15,
    fontFamily: theme.fonts.black,
    color: "#fff",
  },
});

const fieldStyles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[500],
    textAlign: "right",
    paddingRight: 2,
  },
  inputWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  inputError: {
    borderColor: theme.colors.red[400],
    backgroundColor: theme.colors.red[50],
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text.primary,
    paddingVertical: 10,
  },
  error: {
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    color: theme.colors.red[500],
    textAlign: "right",
    paddingRight: 4,
  },
});
