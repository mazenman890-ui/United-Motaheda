/**
 * AddRxManual — manual Rx-number entry + debounced lookup + create.
 *
 * State machine (derived from rxNumber.length + lookup state):
 *   idle        — empty input
 *   typing      — 1–(MIN_DIGITS-1) digits, minimum not yet reached
 *   looking_up  — MIN_DIGITS+ digits, debounce pending OR lookup in-flight;
 *                 pendingFor is set immediately so the spinner appears
 *                 during the quiet period as well
 *   found       — lookup returned a match
 *   not_found   — lookup returned null (no match at this length)
 *
 * Lookup fires DEBOUNCE_MS after the last keystroke for any rxNumber length
 * in [MIN_DIGITS, MAX_DIGITS].  Each edit restarts the debounce and cancels
 * any in-flight request via a cancellation flag.
 *
 * NOTE: until the pharmacy lookup API ships, lookupRxNumber() always resolves
 * null — the not-found callout guides the user to WhatsApp support, which is
 * the real operational channel for adding prescriptions today.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
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
import { flexRow, isRtl } from "@/utils/layout";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth";
import { usePrescriptionsStore, type Prescription } from "@/stores/prescriptionsStore";
import { lookupRxNumber, type RxLookupResult } from "../lib/manualLookup";
import { theme } from "@/shared/theme";

/** Minimum valid prescription number length; also drives initial box count. */
const MIN_DIGITS  = 7;
/** Maximum valid prescription number length. */
const MAX_DIGITS  = 10;
/** Quiet-typing window before firing a lookup (ms). */
const DEBOUNCE_MS = 500;

type ScreenState = "idle" | "typing" | "looking_up" | "found" | "not_found";

// ── Digit display ─────────────────────────────────────────────────────────

function DigitDisplay({ rxNumber }: { rxNumber: string }): React.ReactElement {
  // Box count starts at MIN_DIGITS and grows one-for-one with each additional digit.
  const boxCount = Math.min(MAX_DIGITS, Math.max(MIN_DIGITS, rxNumber.length));
  const boxes    = Array.from({ length: boxCount }, (_, i) => rxNumber[i] ?? "");

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        rxNumber.length === 0
          ? "لم يتم إدخال أرقام"
          : `الأرقام المدخلة: ${rxNumber.split("").join(" ")}`
      }
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
              color:      d !== "" ? theme.colors.text.primary : theme.colors.text.disabled,
              fontFamily: theme.fonts.extrabold,
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

// ── Callouts ──────────────────────────────────────────────────────────────

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

const WHATSAPP_RX_URL =
  `https://wa.me/201112343212?text=${encodeURIComponent("مرحباً، أريد إضافة وصفة طبية إلى حسابي.")}`;

function NotFoundCallout(): React.ReactElement {
  return (
    <View style={[styles.notFoundCallout, { backgroundColor: theme.colors.error.bg, borderColor: theme.colors.error.light }]}>
      <View style={styles.notFoundRow}>
        <Ionicons name="alert-circle" size={18} color={theme.colors.error.base} />
        <Text variant="caption" align="right" style={{ flex: 1, color: theme.colors.error.text, lineHeight: 18 }}>
          لم نعثر على وصفة بهذا الرقم. تأكد من الرقم، أو أرسل صورة الوصفة عبر واتساب وسيضيفها فريق الصيدلية إلى حسابك.
        </Text>
      </View>
      <Button
        variant="secondary"
        size="sm"
        fullWidth
        onPress={() => { void Linking.openURL(WHATSAPP_RX_URL).catch(() => {}); }}
        leftIcon={<Ionicons name="logo-whatsapp" size={15} color={theme.colors.success.strong} />}>
        إرسال الوصفة عبر واتساب
      </Button>
    </View>
  );
}

// ── Match preview card ────────────────────────────────────────────────────
// Builds a temporary Prescription for RxCard to render in read-only mode.
// The id ("preview-match") is discarded — addPrescription() generates the
// real id at submit time.

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
  /** undefined = lookup not yet resolved; null = looked up, no match; object = match */
  const [lookup, setLookup]     = useState<RxLookupResult | null | undefined>(undefined);
  /**
   * The rxNumber value currently being looked up (set before the debounce fires
   * so the UI enters "looking_up" immediately, not just when the request lands).
   */
  const [pendingFor, setPendingFor] = useState<string | null>(null);

  const screenState: ScreenState = useMemo(() => {
    if (rxNumber.length === 0)         return "idle";
    if (rxNumber.length < MIN_DIGITS)  return "typing";
    if (pendingFor === rxNumber)       return "looking_up";
    if (lookup === null)               return "not_found";
    if (lookup !== undefined)          return "found";
    // pendingFor cleared but lookup still undefined — transient; treat as looking_up
    return "looking_up";
  }, [rxNumber, lookup, pendingFor]);

  // Debounced lookup: fires DEBOUNCE_MS after the last keystroke, for any
  // length in [MIN_DIGITS, MAX_DIGITS].
  useEffect(() => {
    if (rxNumber.length < MIN_DIGITS || rxNumber.length > MAX_DIGITS) {
      setLookup(undefined);
      setPendingFor(null);
      return;
    }

    // Mark pending immediately — spinner shows during debounce window too.
    setPendingFor(rxNumber);
    setLookup(undefined);

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      lookupRxNumber(rxNumber).then((result) => {
        if (cancelled) return;
        setLookup(result);
        setPendingFor(null);
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rxNumber]);

  const onDigit = useCallback((d: string) => {
    setRxNumber((prev) => prev.length >= MAX_DIGITS ? prev : prev + d);
  }, []);

  const onBackspace = useCallback(() => {
    setRxNumber((prev) => prev.slice(0, -1));
  }, []);

  const onSubmit = useCallback(() => {
    if (screenState !== "found" || !lookup || !user?.id) return;
    const created = addPrescription({
      ...lookup,
      userId:   user.id,
      rxNumber,
      status:   "active",
    });
    router.replace(`/prescriptions/${created.id}` as never);
  }, [addPrescription, lookup, rxNumber, router, screenState, user?.id]);

  const previewRx = lookup && screenState === "found" && user?.id
    ? buildPreviewRx(lookup, user.id)
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
          رقم مكوّن من {MIN_DIGITS} إلى {MAX_DIGITS} أرقام، تجده على ملصق الزجاجة
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

        {screenState === "not_found" && <NotFoundCallout />}

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
          ]}
          pointerEvents="box-none">
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
    flex:             1,
    backgroundColor:  theme.colors.bg,
  },

  digitsRow: {
    flexDirection:   flexRow(isRtl()),
    justifyContent:  "center",
    gap:             theme.spacing[1],
    paddingVertical: theme.spacing[2],
  },
  digitBox: {
    width:           36,
    height:          48,
    borderRadius:    theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    alignItems:      "center",
    justifyContent:  "center",
  },
  digitBoxFilled: {
    borderColor:     theme.colors.brand.base,
    backgroundColor: theme.colors.brand.lighter,
  },

  lookupRow: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    justifyContent:  "center",
    gap:             theme.spacing[1],
    paddingVertical: theme.spacing[1],
  },

  callout: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "flex-start",
    gap:           theme.spacing[1],
    padding:       theme.spacing[1.5],
    borderRadius:  theme.layout.cardRadius,
    borderWidth:   1,
  },

  // NotFoundCallout has a different shape (icon+text row, then full-width button below)
  notFoundCallout: {
    gap:          theme.spacing[1.5],
    padding:      theme.spacing[1.5],
    borderRadius: theme.layout.cardRadius,
    borderWidth:  1,
  },
  notFoundRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "flex-start",
    gap:           theme.spacing[1],
  },

  keypad: {
    gap:       theme.spacing[1],
    marginTop: theme.spacing[1.5],
  },
  keypadRow: {
    flexDirection:  "row",
    gap:            theme.spacing[1],
    justifyContent: "center",
  },
  key: {
    flex:            1,
    height:          60,
    maxWidth:        110,
    borderRadius:    theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.xs,
  },
  keyBlank: {
    flex:     1,
    height:   60,
    maxWidth: 110,
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
