/**
 * InteractionBanner — drug-interaction safety surface.
 *
 * Spec: HANDOFF.md §3.3 + SPEC §9.2.
 *
 * Two variants:
 *   - "card" — inline. Severity strip + drug-pair visual + summary/detail/watch list.
 *   - "full" — adds the action footer (Ask pharmacist + Cancel + Add anyway).
 *
 * Severity tones map to SPEC §10.3 — mild=neutral/warn, moderate=warn,
 * severe=danger. All copy Arabic.
 */

import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/theme";
import { Card, Text } from "@/shared/ui";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export type InteractionSeverity = "mild" | "moderate" | "severe";

export interface DrugRef {
  name:    string;
  dose?:   string;
  status?: "current" | "new";
}

export interface InteractionBannerProps {
  severity:       InteractionSeverity;
  drugA:          DrugRef;
  drugB:          DrugRef;
  summary:        string;
  detail?:        string;
  watchFor?:      string[];
  onAskPharmacist?: () => void;
  onProceed?:     () => void;
  onCancel?:      () => void;
  variant?:       "card" | "full";
}

const SEVERITY_CONFIG: Record<InteractionSeverity, {
  bannerBg: string;
  bannerFg: string;
  pinBg:    string;
  badge:    "neutral" | "warning" | "error";
  label:    string;
  accent:   string;
}> = {
  mild: {
    bannerBg: theme.colors.warning.bg,
    bannerFg: theme.colors.warning.text,
    pinBg:    theme.colors.warning.base,
    badge:    "neutral",
    label:    "خفيف",
    accent:   theme.colors.warning.base,
  },
  moderate: {
    bannerBg: theme.colors.warning.bg,
    bannerFg: theme.colors.warning.text,
    pinBg:    theme.colors.warning.base,
    badge:    "warning",
    label:    "متوسط",
    accent:   theme.colors.warning.base,
  },
  severe: {
    bannerBg: theme.colors.error.bg,
    bannerFg: theme.colors.error.text,
    pinBg:    theme.colors.error.base,
    badge:    "error",
    label:    "شديد",
    accent:   theme.colors.error.base,
  },
};

function DrugPip({ drug }: { drug: DrugRef }): React.ReactElement {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{
        width: 48, height: 48, borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.brand.lighter,
        alignItems: "center", justifyContent: "center",
        marginBottom: theme.spacing[1],
      }}>
        <Ionicons name="medkit" size={22} color={theme.colors.brand.base} />
      </View>
      <Text variant="caption" weight="extrabold" align="center">{drug.name}</Text>
      {drug.dose && <Text variant="eyebrow" color="tertiary" align="center">{drug.dose}</Text>}
      {drug.status && (
        <Text variant="eyebrow" color="tertiary" align="center" style={{ marginTop: 2 }}>
          {drug.status === "current" ? "حالي" : "جديد"}
        </Text>
      )}
    </View>
  );
}

export function InteractionBanner({
  severity,
  drugA,
  drugB,
  summary,
  detail,
  watchFor,
  onAskPharmacist,
  onProceed,
  onCancel,
  variant = "card",
}: InteractionBannerProps): React.ReactElement {
  const cfg = SEVERITY_CONFIG[severity];

  return (
    <Card padding={0} radius={theme.layout.cardRadius} style={{ overflow: "hidden" }}>
      {/* Banner strip */}
      <View style={{
        flexDirection:     "row-reverse",
        alignItems:        "center",
        gap:               theme.spacing[1],
        paddingHorizontal: theme.spacing[2],
        paddingVertical:   theme.spacing[1.5],
        backgroundColor:   cfg.bannerBg,
      }}>
        <View style={{
          width: 36, height: 36, borderRadius: theme.radius.md,
          backgroundColor: cfg.pinBg,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="warning" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" weight="extrabold" align="right" style={{ color: cfg.bannerFg }}>
            تم رصد تفاعل دوائي
          </Text>
          <Text variant="eyebrow" color="secondary" align="right" style={{ marginTop: 1 }}>
            راجعنا أدويتك الفعّالة قبل الإضافة
          </Text>
        </View>
        <Badge variant={cfg.badge} size="md">{cfg.label}</Badge>
      </View>

      <View style={{ padding: theme.spacing[2] }}>
        {/* Drug-pair visual */}
        <View style={{
          flexDirection:  "row-reverse",
          alignItems:     "center",
          gap:            theme.spacing[1.5],
          marginBottom:   theme.spacing[2],
        }}>
          <DrugPip drug={drugA} />
          <Ionicons name="close" size={20} color={cfg.accent} />
          <DrugPip drug={drugB} />
        </View>

        <Text variant="body" weight="bold" align="right">{summary}</Text>
        {detail && (
          <Text variant="body-sm" color="secondary" align="right" style={{ marginTop: theme.spacing[1] }}>
            {detail}
          </Text>
        )}

        {watchFor && watchFor.length > 0 && (
          <View style={{ marginTop: theme.spacing[1.5], gap: theme.spacing[1] }}>
            <Text variant="eyebrow" color="tertiary" align="right">
              ما يجب الانتباه له
            </Text>
            {watchFor.map((w) => (
              <View key={w} style={{ flexDirection: "row-reverse", alignItems: "center", gap: theme.spacing[1] }}>
                <Ionicons name="ellipse" size={6} color={cfg.accent} />
                <Text variant="body-sm" align="right" style={{ flex: 1 }}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {variant === "full" && (
          <View style={{ marginTop: theme.spacing[2], gap: theme.spacing[1] }}>
            {onAskPharmacist && (
              <Button
                variant="primary"
                fullWidth
                leftIcon={<Ionicons name="chatbox" size={16} color="#fff" />}
                onPress={onAskPharmacist}>
                اسأل الصيدلي · مجاناً
              </Button>
            )}
            <View style={{ flexDirection: "row-reverse", gap: theme.spacing[1] }}>
              {onCancel && (
                <View style={{ flex: 1 }}>
                  <Button variant="outline" fullWidth onPress={onCancel}>إلغاء</Button>
                </View>
              )}
              {onProceed && (
                <View style={{ flex: 1 }}>
                  <Button variant="dark" fullWidth onPress={onProceed}>إضافة بأي حال</Button>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}
