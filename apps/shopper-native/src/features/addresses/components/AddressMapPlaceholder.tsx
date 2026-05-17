import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";

interface Props {
  lat?: number;
  lng?: number;
  compact?: boolean;
}

export function AddressMapPlaceholder({ lat, lng, compact }: Props) {
  const hasCoords = lat != null && lng != null;
  const height = compact ? 100 : 140;

  return (
    <View style={[styles.container, { height }]}>
      <LinearGradient
        colors={["#E6FAF8", "#EEF2F7", "#E1EAF2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Grid lines */}
      <View style={styles.gridOverlay}>
        {Array(5)
          .fill(null)
          .map((_, i) => (
            <View key={`h${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 20}%` as any }]} />
          ))}
        {Array(7)
          .fill(null)
          .map((_, i) => (
            <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 14}%` as any }]} />
          ))}
      </View>

      {/* Center pin */}
      <View style={styles.pinWrap}>
        <View style={styles.pinShadow} />
        <View style={styles.pin}>
          <Ionicons name="location" size={compact ? 18 : 22} color={theme.colors.brand[600]} />
        </View>
        <View style={styles.pinDot} />
      </View>

      {/* Coords label */}
      {hasCoords && !compact && (
        <View style={styles.coordsBadge}>
          <Text style={styles.coordsText}>
            {lat!.toFixed(4)}, {lng!.toFixed(4)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(8,145,178,0.08)",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(8,145,178,0.08)",
  },
  pinWrap: {
    alignItems: "center",
    gap: 2,
  },
  pinShadow: {
    position: "absolute",
    bottom: -6,
    width: 20,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(8,145,178,0.12)",
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.md,
    borderWidth: 2,
    borderColor: theme.colors.brand[100],
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.brand[600],
    marginTop: 4,
  },
  coordsBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  coordsText: {
    fontSize: 9,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[500],
  },
});
