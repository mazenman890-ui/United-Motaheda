/**
 * BranchSelector — list of branches with selection state.
 *
 * Sorts by distance when customer coordinates are provided; otherwise
 * shows the primary branch first.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BranchCard } from "./BranchCard";
import { useBranches } from "../branches/useBranches";
import { sortBranchesByDistance, type Coordinates } from "../geofencing";
import { theme } from "@/theme";
import type { Branch } from "../branches/types";

interface BranchSelectorProps {
  selectedId: string | null;
  onSelect: (branch: Branch) => void;
  customerCoords?: Coordinates | null;
  compact?: boolean;
  maxItems?: number;
}

export function BranchSelector({
  selectedId,
  onSelect,
  customerCoords,
  compact,
  maxItems,
}: BranchSelectorProps) {
  const { data: branches = [], isLoading } = useBranches();

  const ranked = useMemo(() => {
    const enabled = branches.filter((b) => b.deliveryEnabled);
    if (customerCoords) {
      return sortBranchesByDistance(customerCoords, enabled);
    }
    // Default: primary first, then preserve insertion order
    const primary = enabled.filter((b) => b.isPrimary).map((b) => ({ branch: b, distanceKm: undefined as number | undefined }));
    const rest    = enabled.filter((b) => !b.isPrimary).map((b) => ({ branch: b, distanceKm: undefined as number | undefined }));
    return [...primary, ...rest];
  }, [branches, customerCoords]);

  const visible = maxItems ? ranked.slice(0, maxItems) : ranked;

  if (isLoading) {
    return <BranchSkeletons count={compact ? 2 : 3} />;
  }

  if (visible.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="storefront-outline" size={20} color={theme.colors.slate[400]} />
        <Text style={styles.emptyText}>لا توجد فروع متاحة للتوصيل حالياً</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {visible.map(({ branch, distanceKm }, i) => (
        <Animated.View key={branch.id} entering={FadeInDown.delay(i * 50).duration(220)}>
          <BranchCard
            branch={branch}
            selected={branch.id === selectedId}
            distanceKm={distanceKm}
            onPress={() => onSelect(branch)}
            compact={compact}
          />
        </Animated.View>
      ))}
    </View>
  );
}

function BranchSkeletons({ count }: { count: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skel} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skel: {
    height: 76,
    borderRadius: 16,
    backgroundColor: theme.colors.slate[100],
  },
  emptyCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.slate[200],
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[500],
    textAlign: "right",
  },
});
