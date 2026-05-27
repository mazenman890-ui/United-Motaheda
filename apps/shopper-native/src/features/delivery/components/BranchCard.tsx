/**
 * BranchCard — premium branch display row.
 * Selectable / non-selectable. Shows name, area, hours, distance.
 */

import React, { memo, useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { theme } from "@/theme";
import type { Branch } from "../branches/types";

interface BranchCardProps {
  branch: Branch;
  selected?: boolean;
  distanceKm?: number;
  onPress?: () => void;
  compact?: boolean;
}

export const BranchCard = memo(function BranchCard({
  branch,
  selected,
  distanceKm,
  onPress,
  compact,
}: BranchCardProps) {
  const interactive = !!onPress;

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      onPress={interactive ? handlePress : undefined}
      disabled={!interactive}
      accessibilityRole={interactive ? "radio" : undefined}
      accessibilityLabel={`${branch.nameAr}، ${branch.area}${typeof distanceKm === "number" ? `، على بُعد ${distanceKm.toFixed(1)} كم` : ""}`}
      accessibilityState={interactive ? { checked: !!selected } : undefined}
      style={[
        styles.card,
        selected && styles.cardSelected,
        compact && styles.cardCompact,
      ]}>
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Ionicons
          name={branch.isPrimary ? "star" : "medkit"}
          size={16}
          color={selected ? "#fff" : theme.colors.brand[600]}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {branch.nameAr}
          </Text>
          {branch.isPrimary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>الرئيسي</Text>
            </View>
          )}
        </View>
        <Text style={styles.area} numberOfLines={1}>{branch.area}</Text>
        {!compact && (
          <>
            <Text style={styles.address} numberOfLines={2}>{branch.addressAr}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={10} color={theme.colors.slate[500]} />
                <Text style={styles.metaText}>{branch.hoursAr}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.right}>
        {typeof distanceKm === "number" && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.distPill}>
            <Ionicons name="navigate-outline" size={10} color={theme.colors.brand[600]} />
            <Text style={styles.distText}>{distanceKm.toFixed(1)} كم</Text>
          </Animated.View>
        )}
        {interactive && (
          <View style={[styles.radio, selected && styles.radioActive]}>
            {selected && <View style={styles.radioDot} />}
          </View>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
  },
  cardCompact: { paddingVertical: 10 },
  cardSelected: {
    borderColor: theme.colors.brand[400],
    backgroundColor: theme.colors.brand[50] + "60",
    ...theme.shadow.xs,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: { backgroundColor: theme.colors.brand[600] },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  title: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.text.primary, textAlign: "right" },
  primaryBadge: {
    backgroundColor: theme.colors.amber[50],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  primaryBadgeText: { fontSize: 9, fontFamily: theme.fonts.bold, color: theme.colors.amber[700] },
  area: { fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.brand[600], textAlign: "right" },
  address: { fontSize: 11, fontFamily: theme.fonts.regular, color: theme.colors.slate[500], textAlign: "right", lineHeight: 16 },
  metaRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metaPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.slate[50],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaText: { fontSize: 9, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500] },
  right: { alignItems: "center", gap: 8 },
  distPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.brand[50],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  distText: { fontSize: 9, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.slate[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: theme.colors.brand[600] },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.brand[600],
  },
});
