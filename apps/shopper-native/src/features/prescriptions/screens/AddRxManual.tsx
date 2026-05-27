/**
 * AddRxManual — manual Rx-number entry + mock lookup + create.
 *
 * State machine (derived from rxNumber.length + lookup result):
 *   idle        — empty input
 *   typing      — 1–7 or 9–10 digits (lookup not fired)
 *   looking_up  — exactly 8 digits, awaiting mockLookup()
 *   found       — exactly 8 digits, match returned
 *   not_found   — exactly 8 digits, no match
 *
 * Any keystroke during found/not_found returns to typing (the effect just
 * re-runs against the new digit string).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Direct imports (not the barrel) to break a require cycle:
// shared/components/index → PharmacyBootstrap → features/prescriptions → here.
import { AppHeader } from "@/shared/components/AppHeader";
import { RxCard }    from "@/shared/components/RxCard";
import { Text } from "@/shared/ui";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth";
import { usePrescriptionsStore, type Prescription } from "@/stores/prescriptionsStore";
import { mockLookup, type RxLookupResult } from "../lib/manualLookup";
import { theme } from "@/theme";

const MIN_BOXES   = 7;
const MAX_DIGITS  = 10;
const LOOKUP_AT   = 8;

type ScreenState = "idle" | "typing" | "looking_up" | "found" | "not_found";

// ── Digit display ─────────────────────────────────────────────────────────

function DigitDisplay({ rxNumber }: { rxNumber: string }): React.ReactElement {
  const boxCount = Math.min(MAX_DIGITS, Math.max(MIN_BOXES, rxNumber.length));
  const boxes    = Array.from({ length: boxCount }, (_, i) => rxNumber[i] ?? "");

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={rxNumber.length === 0 ? "لم يتم إدخال أرقام" : `الأرقام المدخلة: ${rxNumber.split("").join(" ")}`}
      style={styles.digitsRow}>
      {boxes.map((d, i) => (
        <View
          key={i}
          style={[
            styles.digitBox,
            d !== "" && styles.digitBoxFilled,
          ]}>
          <Text
            variant="screen-title"
            align="center"
            style={{
              color: d !== "" ? theme.colors.text.primary : theme.colors.text.disabled,
              fontFamily: theme.fonts.extrabold,
              // Monospace-ish feel: rely on Cairo's tabular figures (default).
            }}>
            {d || "·"}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Keypad ────────────────────────────────────────────────────────────────

interface KeypadProps {
  onDigit:     (d: string) => void;
  onBackspace: () => void;
  disabled?:   boolean;
}

const KEY_ROWS: (string | "del" | "blank")[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["blank", "0", "del"],
];

function Keypad({ onDigit, onBackspace, disabled }: KeypadProps): React.ReactElement {
  return (
    <View style={styles.keypad}>
      {KEY_ROWS.map((row, ri) => (
        <View key={ri} style={styles.keypadRow}>
          {row.map((key, ci) => {
            if (key === "blank") {
              return <View key={ci} style={styles.keyBlank} />;
            }
            const isDel = key === "del";
            return (
              <Pressable
                key={ci}
                onPress={isDel ? onBackspace : () => onDigit(key)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={isDel ? "حذف آخر رقم" : `رقم ${key}`}
                style={({ pressed }) => [
                  styles.key,
                  pressed && { backgroundColor: theme.colors.subtle, transform: [{ scale: 0.97 }] },
                  disabled && { opacity: 0.55 },
                ]}>
                {isDel ? (
                  <Ionicons name="backspace-outline" size={22} color={theme.colors.text.primary} />
                ) : (
                  <Text
                    variant="screen-title"
                    align="center"
                    style={{ fontFamily: theme.fonts.bold }}>
                    {key}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Result callouts ───────────────────────────────────────────────────────

function PrivacyCallout(): React.ReactElement {
  return (
    <View style={[styles.callout, { backgroundColor: theme.colors.warning.bg, borderColor: theme.colors.warning.light }]}>
      <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.warning.base} />
      <Text variant="caption" align="right" style={{ flex: 1, color: theme.colors.warning.text, lineHeight: 18 }}>
        رقم وصفتك خاص. نستخدمه فقط للبحث عنها لدى مقدّم الرعاية الصحية.
      </Text>
    </View>
  );
}

function FoundCallout(): React.ReactElement {
  return (
    <View style={[styles.callout, { backgroundColor: theme.colors.success.bg, borderColor: theme.colors.success.light }]}>
      <Ionicons name="checkmark-circle" size={18} color={theme.colors.success.base} />
      <Text variant="caption" align="right" style={{ flex: 1, color: theme.colors.success.text, lineHeight: 18 }}>
        وُجدت! تحقق من البيانات قبل الإضافة.
      </Text>
    </View>
  );
}

function NotFoundRow(): React.ReactElement {
  return (
    <View style={[styles.callout, { backgroundColor: theme.colors.error.bg, borderColor: theme.colors.error.light }]}>
      <Ionicons name="alert-circle" size={18} color={theme.colors.error.base} />
      <Text variant="caption" align="right" style={{ flex: 1, color: theme.colors.error.text, lineHeight: 18 }}>
        لم نتمكن من العثور على هذه الوصفة. تحقق من الرقم وحاول مرة أخرى.
      </Text>
    </View>
  );
}

// ── Match preview card ────────────────────────────────────────────────────
// We build a mock Prescription for RxCard to render in read-only mode. The
// id ("preview-match") is irrelevant — the real id is generated by
// addPrescription() at submit time.

function buildPreviewRx(match: RxLookupResult, userId: string): Prescription {
  const stamp = new Date().toISOString();
  return {
    id:           "preview-match",
    userId,
    name:         match.name,
    dose:         match.dose,
    refills:      match.refills,
    nextRefill:   match.nextRefill,
    doctor:       match.doctor,
    status:       match.status,
    isControlled: match.isControlled,
    schedule:     match.schedule,
    addedAt:      stamp,
    updatedAt:    stamp,
  };
}

// ── Screen ────────────────────────────────────────────────────────────────

export function AddRxManual(): React.ReactElement {
  const router            = useRouter();
  const insets            = useSafeAreaInsets();
  const { user }          = useAuth();
  const addPrescription   = usePrescriptionsStore((s) => s.addPrescription);

  const [rxNumber, setRxNumber] = useState("");
  /** undefined = no lookup attempted; null = looked up, no match; object = match */
  const [lookup, setLookup]     = useState<RxLookupResult | null | undefined>(undefined);
  const [pendingFor, setPendingFor] = useState<string | null>(null);

  const screenState: ScreenState = useMemo(() => {
    if (rxNumber.length === 0)                                  return "idle";
    if (rxNumber.length !== LOOKUP_AT)                          return "typing";
    if (pendingFor === rxNumber)                                return "looking_up";
    if (lookup === undefined)                                   return "looking_up";
    if (lookup === null)                                        return "not_found";
    return "found";
  }, [rxNumber, lookup, pendingFor]);

  // Lookup effect — fires whenever rxNumber settles on exactly LOOKUP_AT digits.
  useEffect(() => {
    if (rxNumber.length !== LOOKUP_AT) {
      setLookup(undefined);
      setPendingFor(null);
      return;
    }
    let cancelled = false;
    setPendingFor(rxNumber);
    mockLookup(rxNumber).then((result) => {
      if (cancelled) return;
      setLookup(result);
      setPendingFor(null);
    });
    return () => { cancelled = true; };
  }, [rxNumber]);

  const onDigit = useCallback((d: string) => {
    setRxNumber((prev) => (prev.length >= MAX_DIGITS ? prev : prev + d));
  }, []);

  const onBackspace = useCallback(() => {
    setRxNumber((prev) => prev.slice(0, -1));
  }, []);

  const onSubmit = useCallback(() => {
    if (screenState !== "found" || !lookup) return;
    const created = addPrescription({
      ...lookup,
      userId:   user?.id ?? "dev-user",
      rxNumber,
      status:   "active",
    });
    router.replace(`/prescriptions/${created.id}` as never);
  }, [addPrescription, lookup, rxNumber, router, screenState, user?.id]);

  const previewRx = lookup && screenState === "found"
    ? buildPreviewRx(lookup, user?.id ?? "dev-user")
    : null;

  return (
    <View style={styles.screen}>
      <AppHeader title="إدخال رقم الوصفة" showBack />

      <ScrollView
        contentContainerStyle={{
          padding:       theme.layout.pagePaddingH,
          paddingBottom: insets.bottom + theme.layout.buttonHeight + theme.spacing[3],
          gap:           theme.spacing[2],
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <Text variant="caption" color="secondary" align="right">
          رقم مكوّن من 7 إلى 10 أرقام، تجده على ملصق الزجاجة
        </Text>

        <DigitDisplay rxNumber={rxNumber} />

        {screenState === "looking_up" && (
          <View style={styles.lookupRow}>
            <Ionicons name="search" size={16} color={theme.colors.brand.base} />
            <Text variant="caption" color="secondary">جارٍ البحث…</Text>
          </View>
        )}

        {screenState === "found" && previewRx && (
          <View style={{ gap: theme.spacing[1.5] }}>
            <RxCard prescription={previewRx} variant="list" />
            <FoundCallout />
          </View>
        )}

        {screenState === "not_found" && <NotFoundRow />}

        {(screenState === "idle" || screenState === "typing") && <PrivacyCallout />}

        <Keypad
          onDigit={onDigit}
          onBackspace={onBackspace}
          disabled={screenState === "looking_up"}
        />
      </ScrollView>

      {screenState === "found" && (
        <View
          style={[
            styles.ctaBar,
            { paddingBottom: Math.max(insets.bottom, theme.spacing[1.5]) },
              , { pointerEvents: "box-none" } ]}
          >
          <Button
            variant="primary"
            fullWidth
            onPress={onSubmit}>
            إضافة إلى وصفاتي
          </Button>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  digitsRow: {
    flexDirection:    "row-reverse",
    justifyContent:   "center",
    gap:              theme.spacing[1],
    paddingVertical:  theme.spacing[2],
  },
  digitBox: {
    width:            36,
    height:           48,
    borderRadius:     theme.radius.md,
    backgroundColor:  theme.colors.surface,
    borderWidth:      1,
    borderColor:      theme.colors.border.default,
    alignItems:       "center",
    justifyContent:   "center",
  },
  digitBoxFilled: {
    borderColor:      theme.colors.brand.base,
    backgroundColor:  theme.colors.brand.lighter,
  },
  lookupRow: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    justifyContent:   "center",
    gap:              theme.spacing[1],
    paddingVertical:  theme.spacing[1],
  },
  callout: {
    flexDirection:    "row-reverse",
    alignItems:       "flex-start",
    gap:              theme.spacing[1],
    padding:          theme.spacing[1.5],
    borderRadius:     theme.layout.cardRadius,
    borderWidth:      1,
  },
  keypad: {
    gap:              theme.spacing[1],
    marginTop:        theme.spacing[1.5],
  },
  keypadRow: {
    flexDirection:    "row",
    gap:              theme.spacing[1],
    justifyContent:   "center",
  },
  key: {
    flex:             1,
    height:           60,
    maxWidth:         110,
    borderRadius:     theme.radius.lg,
    backgroundColor:  theme.colors.surface,
    borderWidth:      1,
    borderColor:      theme.colors.border.default,
    alignItems:       "center",
    justifyContent:   "center",
    ...theme.shadow.xs,
  },
  keyBlank: {
    flex:             1,
    height:           60,
    maxWidth:         110,
  },
  ctaBar: {
    position:          "absolute",
    left:              0,
    right:             0,
    bottom:            0,
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop:        theme.spacing[1.5],
    backgroundColor:   theme.colors.bg,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    theme.colors.border.default,
  },
});
