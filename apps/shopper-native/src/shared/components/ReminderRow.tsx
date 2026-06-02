/**
 * ReminderRow — single medication-reminder line.
 *
 * Spec: HANDOFF.md §3.2 + SPEC §9.2.
 *
 * Renders a check-circle, drug name (strike-through when taken), dose note,
 * scheduled time, and optional "Take" / "Snooze" actions. All copy Arabic.
 */

import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { Text } from "@/shared/ui";
import { Button } from "@/components/ui/Button";

export interface Reminder {
  id:             string;
  prescriptionId: string;
  name:           string;
  doseNote?:      string;
  time:           string;             // "8:00 ص"
  due:            "Today" | "Tomorrow" | "Upcoming";
  taken:          boolean;
  takenAt?:       string;
}

export interface ReminderRowProps {
  reminder:    Reminder;
  onToggle?:   (id: string, taken: boolean) => void;
  onSnooze?:   (id: string) => void;
  showAction?: boolean;
}

export function ReminderRow({
  reminder: r,
  onToggle,
  onSnooze,
  showAction = true,
}: ReminderRowProps): React.ReactElement {
  const { t }  = useTranslation();
  const toggle = (): void => onToggle?.(r.id, !r.taken);

  return (
    <View
      style={{
        flexDirection:    "row-reverse",
        alignItems:       "center",
        gap:              theme.spacing[1.5],
        paddingVertical:  14,
        paddingHorizontal: theme.spacing[2],
      }}>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: r.taken }}
        accessibilityLabel={r.taken ? t("reminder.accessTaken", { name: r.name }) : t("reminder.accessNotTaken", { name: r.name })}>
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: r.taken ? theme.colors.success.base : "transparent",
          borderWidth: 2,
          borderColor: r.taken ? theme.colors.success.base : theme.colors.border.strong,
          alignItems: "center", justifyContent: "center",
        }}>
          {r.taken && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </Pressable>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          variant="body"
          weight="bold"
          numberOfLines={1}
          align="right"
          style={{
            textDecorationLine: r.taken ? "line-through" : "none",
            color: r.taken ? theme.colors.text.tertiary : theme.colors.text.primary,
          }}>
          {r.name}
        </Text>
        {r.doseNote && (
          <Text variant="caption" color="secondary" numberOfLines={1} align="right" style={{ marginTop: 2 }}>
            {r.doseNote}
          </Text>
        )}
        <Text variant="eyebrow" color="tertiary" align="right" style={{ marginTop: 2 }}>
          {r.time}
        </Text>
      </View>

      {showAction && !r.taken && (
        <View style={{ flexDirection: "row-reverse", gap: theme.spacing[0.5] }}>
          {onSnooze && (
            <Button size="sm" variant="outline" onPress={() => onSnooze(r.id)}>
              {t("reminder.snooze")}
            </Button>
          )}
          <Button size="sm" variant="primary" onPress={toggle}>
            {t("reminder.markTaken")}
          </Button>
        </View>
      )}
    </View>
  );
}
