/**
 * BranchMap — interactive map of all delivery branches.
 *
 * Tappable markers select the corresponding branch.
 * Falls back to a styled placeholder when react-native-maps is unavailable
 * (e.g. Expo Go without a dev build) — caught via a top-level try/require.
 *
 * Native requirements:
 *  - Dev build (`npx expo prebuild` + EAS build, or `expo run:ios/android`)
 *  - iOS:     no extra config (Apple Maps used by default)
 *  - Android: PROVIDER_GOOGLE + Google Maps API key in app.json
 *             ("android": { "config": { "googleMaps": { "apiKey": "..." } } })
 */

import React, { useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { theme } from "@/theme";
import type { Branch } from "../branches/types";

// ─── Optional native module load (gracefully degrades) ──────────────────────

type MapModule = typeof import("react-native-maps");
let MapsModule: MapModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  MapsModule = require("react-native-maps");
} catch {
  MapsModule = null;
}

interface BranchMapProps {
  branches: readonly Branch[];
  selectedId?: string | null;
  onSelect?: (branch: Branch) => void;
  height?: number;
}

export function BranchMap({ branches, selectedId, onSelect, height = 280 }: BranchMapProps) {
  const mapRef = useRef<any>(null);

  // Compute initial region covering all branches with a small padding
  const initialRegion = useMemo(() => {
    const valid = branches.filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng));
    if (valid.length === 0) {
      return { latitude: 30.05, longitude: 31.30, latitudeDelta: 0.4, longitudeDelta: 0.4 };
    }
    const lats = valid.map((b) => b.lat);
    const lngs = valid.map((b) => b.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.4),
    };
  }, [branches]);

  if (!MapsModule) {
    return <BranchMapFallback height={height} branchCount={branches.length} />;
  }

  const MapView = MapsModule.default;
  const Marker = MapsModule.Marker;

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}>
        {branches.map((b) => (
          <Marker
            key={b.id}
            coordinate={{ latitude: b.lat, longitude: b.lng }}
            title={b.fullNameAr}
            description={b.area}
            onPress={() => onSelect?.(b)}
            pinColor={b.id === selectedId ? "#0DB8A8" : undefined}
          />
        ))}
      </MapView>

      {/* Floating header overlay */}
      <View style={styles.headerOverlay}>
        <View style={styles.headerPill}>
          <Ionicons name="map-outline" size={11} color={theme.colors.slate[600]} />
          <Text style={styles.headerText}>خريطة الفروع</Text>
        </View>
        <View style={styles.headerPill}>
          <Text style={styles.headerText}>{branches.length} فرع</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Fallback ────────────────────────────────────────────────────────────────

function BranchMapFallback({ height, branchCount }: { height: number; branchCount: number }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.fallback, { height }]}>
      <View style={styles.fallbackIcon}>
        <Ionicons name="map-outline" size={26} color={theme.colors.brand[600]} />
      </View>
      <Text style={styles.fallbackTitle}>الخريطة التفاعلية</Text>
      <Text style={styles.fallbackBody}>
        تتطلب نسخة Development Build لعرض الخريطة على الأجهزة.{"\n"}
        تتوفر القائمة الكاملة لـ {branchCount} فرع أدناه.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  headerOverlay: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    pointerEvents: "none",
  },
  headerPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    ...theme.shadow.sm,
  },
  headerText: {
    fontSize: 10,
    fontFamily: theme.fonts.black,
    color: theme.colors.slate[700],
    letterSpacing: 0.2,
  },

  // Fallback
  fallback: {
    borderRadius: 18,
    backgroundColor: theme.colors.brand[50] + "60",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.brand[200],
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  fallbackIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.sm,
  },
  fallbackTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.black,
    color: theme.colors.brand[700],
  },
  fallbackBody: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.brand[700],
    textAlign: "center",
    lineHeight: 18,
  },
});
