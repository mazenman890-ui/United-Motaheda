/**
 * OcrReviewForm — editable confirmation of OCR-extracted Rx fields.
 *
 * Pure UI. No router, no native deps, no store writes. Parent screen owns
 * the lifecycle (camera capture → OCR → parse → mount form → submit/rescan).
 *
 * Five fields, all in Arabic. A "تم التعرّف" badge appears next to a field's
 * label only if that field was populated in `initial` — visual hint to the
 * user about which values came from OCR vs need manual entry.
 *
 * Submit is disabled until `name` is non-empty (the only hard requirement
 * the prescriptions store enforces). All other fields are optional.
 */

import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/shared/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { theme } from "@/theme";
import type { RxStatus } from "@/stores/prescriptionsStore";
import type { ParsedRx } from "../lib/parseRxText";

export interface OcrReviewFormSubmit {
  name:      string;
  dose?:     string;
  refills?:  number;
  doctor?:   string;
  rxNumber?: string;
  status:    RxStatus;
}

export interface OcrReviewFormProps {
  initial:    ParsedRx;
  onSubmit:   (final: OcrReviewFormSubmit) => void;
  onRescan:   () => void;
}

// ── Recognized-from-image badge ────────────────────────────────────────────

function RecognizedBadge(): React.ReactElement {
  return (
    <View
      accessibilityLabel="هذا الحقل تم استخراجه من الصورة"
      style={styles.badge}>
      <Ionicons name="sparkles" size={10} color={theme.colors.brand.base} />
      <Text variant="eyebrow" style={{ color: theme.colors.brand.base }}>
        تم التعرّف
      </Text>
    </View>
  );
}

interface FieldProps {
  label:        string;
  recognized:   boolean;
  required?:    boolean;
  value:        string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  numeric?:     boolean;
}

function Field({
  label, recognized, required, value, onChangeText, placeholder, numeric,
}: FieldProps): React.ReactElement {
  return (
    <View style={{ gap: theme.spacing[0.5] }}>
      <View style={styles.labelRow}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: theme.spacing[0.5] }}>
          <Text variant="caption" weight="bold" align="right">
            {label}{required ? " *" : ""}
          </Text>
          {recognized && <RecognizedBadge />}
        </View>
      </View>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={label}
        keyboardType={numeric ? "number-pad" : "default"}
        textAlign="right"
      />
    </View>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────

export function OcrReviewForm({
  initial,
  onSubmit,
  onRescan,
}: OcrReviewFormProps): React.ReactElement {
  const [name,     setName]     = useState(initial.name     ?? "");
  const [dose,     setDose]     = useState(initial.dose     ?? "");
  const [refills,  setRefills]  = useState(
    initial.refills != null ? String(initial.refills) : "",
  );
  const [doctor,   setDoctor]   = useState(initial.doctor   ?? "");
  const [rxNumber, setRxNumber] = useState(initial.rxNumber ?? "");

  /** Snapshot of "what arrived pre-filled" — drives the badge visibility.
   *  Computed once from `initial` so the badge doesn't disappear after a user
   *  edit (the field is still "OCR-derived", just edited). */
  const recognized = useMemo(() => ({
    name:     initial.name     !== undefined,
    dose:     initial.dose     !== undefined,
    refills:  initial.refills  !== undefined,
    doctor:   initial.doctor   !== undefined,
    rxNumber: initial.rxNumber !== undefined,
  }), [initial]);

  const showNameMissingBanner = initial.name === undefined;
  const canSubmit             = name.trim().length > 0;

  const handleSubmit = (): void => {
    if (!canSubmit) return;
    const refillsParsed = refills.trim() === "" ? undefined : Number.parseInt(refills, 10);
    onSubmit({
      name:     name.trim(),
      dose:     dose.trim()     || undefined,
      refills:  Number.isFinite(refillsParsed) ? refillsParsed : undefined,
      doctor:   doctor.trim()   || undefined,
      rxNumber: rxNumber.trim() || undefined,
      status:   "active",
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.pagePaddingH,
          gap:     theme.spacing[2],
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {showNameMissingBanner && (
          <View style={styles.banner}>
            <Ionicons name="warning" size={18} color={theme.colors.warning.base} />
            <Text variant="caption" align="right" style={{ flex: 1, color: theme.colors.warning.text, lineHeight: 18 }}>
              لم نتعرّف على اسم الدواء تلقائياً. أدخله يدوياً أو حاول مرة أخرى مع إضاءة أفضل.
            </Text>
          </View>
        )}

        <Field
          label="اسم الدواء والجرعة"
          recognized={recognized.name}
          required
          value={name}
          onChangeText={setName}
          placeholder="مثال: ليزينوبريل 10 ملغ"
        />
        <Field
          label="الجرعة المعتادة"
          recognized={recognized.dose}
          value={dose}
          onChangeText={setDose}
          placeholder="مثال: قرص واحد · صباحاً"
        />
        <Field
          label="عدد التجديدات المتبقية"
          recognized={recognized.refills}
          value={refills}
          onChangeText={setRefills}
          placeholder="مثال: 3"
          numeric
        />
        <Field
          label="الطبيب"
          recognized={recognized.doctor}
          value={doctor}
          onChangeText={setDoctor}
          placeholder="مثال: د. أحمد سامي"
        />
        <Field
          label="رقم الوصفة"
          recognized={recognized.rxNumber}
          value={rxNumber}
          onChangeText={setRxNumber}
          placeholder="مثال: 47820094"
          numeric
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          fullWidth
          onPress={handleSubmit}
          disabled={!canSubmit}>
          إضافة إلى وصفاتي
        </Button>
        <Button
          variant="outline"
          fullWidth
          onPress={onRescan}>
          إعادة المسح
        </Button>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing[0.5],
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      theme.radius.xs,
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.brand.light,
  },
  labelRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  banner: {
    flexDirection:   "row-reverse",
    alignItems:      "flex-start",
    gap:             theme.spacing[1],
    padding:         theme.spacing[1.5],
    backgroundColor: theme.colors.warning.bg,
    borderRadius:    theme.layout.cardRadius,
    borderWidth:     1,
    borderColor:     theme.colors.warning.light,
  },
  footer: {
    gap:               theme.spacing[1],
    padding:           theme.layout.pagePaddingH,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    theme.colors.border.default,
    backgroundColor:   theme.colors.bg,
  },
});
