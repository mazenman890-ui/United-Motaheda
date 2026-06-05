/**
 * FlashSaleSection — PROTECTED performance-optimised flash-sale rail.
 *
 * ⚠️  DO NOT change the memoization strategy, CountdownDisplay isolation,
 *     FlashList usage, or stable-callback pattern here.
 *     These were deliberately engineered to prevent the 1-second countdown
 *     tick from re-rendering the product list.
 *
 * Architecture:
 *   • CountdownDisplay is isolated in its own memo so setInterval only
 *     re-renders the timer subtree, never FlashSaleSection or ProductCard.
 *   • FlashSaleItem wraps ProductCard with a stable per-item onPress so
 *     ProductCard.memo's comparator sees no prop changes between renders.
 *   • FlashList (not FlatList) for recycled layout on the horizontal rail.
 */

import React, { memo, useCallback } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { ProductCard } from "@/components/ProductCard";
import { HomeSectionHeader } from "./HomeSectionHeader";
import { flashStyles as fs, cntStyles as cs } from "./home.styles";
import type { NativeProduct } from "@/features/products";
import { useEndOfDayCountdown } from "../hooks/useEndOfDayCountdown";

// ─── Sale discount rotation (stable — module-level constant) ──────────────────
const SALE_DISCOUNTS = [25, 15, 20, 30, 10, 20];

// ─── CountdownUnit ────────────────────────────────────────────────────────────

const CountdownUnit = memo(function CountdownUnit({
  value, label, grad,
}: { value: string; label: string; grad: [string, string] }) {
  return (
    <View style={cs.unit}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.cell}>
        <UIText style={cs.value}>{value}</UIText>
      </LinearGradient>
      <UIText variant="eyebrow" color="tertiary" style={cs.unitLabel}>{label}</UIText>
    </View>
  );
});

// ─── CountdownDisplay — isolated so 1-second tick only re-renders this subtree
const CountdownDisplay = memo(function CountdownDisplay() {
  const { t }       = useTranslation();
  const { h, m, s } = useEndOfDayCountdown();
  return (
    <View style={cs.timerRow}>
      <CountdownUnit value={s} label={t("home.flashSec")} grad={[theme.colors.red[600],   theme.colors.red[500]]}   />
      <UIText style={cs.colon}>:</UIText>
      <CountdownUnit value={m} label={t("home.flashMin")} grad={[theme.colors.amber[600], theme.colors.amber[500]]} />
      <UIText style={cs.colon}>:</UIText>
      <CountdownUnit value={h} label={t("home.flashHrs")} grad={[theme.colors.brand[600], theme.colors.teal[500]]}  />
    </View>
  );
});

// ─── FlashSaleItem — stable list cell ────────────────────────────────────────

const FlashSaleItem = memo(function FlashSaleItem({
  item, index, lang, onPress,
}: {
  item:    NativeProduct;
  index:   number;
  lang:    "ar" | "en";
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);
  return (
    <View style={fs.itemWrap}>
      <ProductCard
        product={item}
        lang={lang}
        badge="sale"
        discountPercent={SALE_DISCOUNTS[index % SALE_DISCOUNTS.length]}
        onPress={handlePress}
      />
    </View>
  );
});

// ─── "View All" button styles ─────────────────────────────────────────────────

const va = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop:        10,
  },
  btn: {
    borderRadius: 14,
    overflow:     "hidden",
  },
  grad: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    paddingVertical: 13,
    borderRadius:    14,
  },
  text: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.surface,
    letterSpacing: 0.1,
  },
});

// ─── FlashSaleSection ─────────────────────────────────────────────────────────

interface FlashSaleSectionProps {
  products:       NativeProduct[];
  onProductPress: (id: string) => void;
  onViewAll?:     () => void;
}

export const FlashSaleSection = memo(function FlashSaleSection({
  products,
  onProductPress,
  onViewAll,
}: FlashSaleSectionProps) {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const items       = products.slice(0, 6);

  const renderFlashItem = useCallback(
    ({ item, index }: { item: NativeProduct; index: number }) => (
      <FlashSaleItem item={item} index={index} lang={lang} onPress={onProductPress} />
    ),
    [lang, onProductPress],
  );

  const handleViewAll = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onViewAll?.();
  }, [onViewAll]);

  if (items.length === 0) return null;

  return (
    <View style={fs.sectionGap}>
      {/* Header: countdown fills the rightSlot; "See All" is a separate
          button below so both elements are always visible.                */}
      <HomeSectionHeader
        eyebrow={t("home.flashEnds")}
        title={t("home.flashTitle")}
        icon="flash"
        accent={theme.colors.red[500]}
        rightSlot={<CountdownDisplay />}
      />

      {/* Horizontal product rail */}
      <FlashList
        data={items}
        keyExtractor={(p) => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH }}
        renderItem={renderFlashItem}
        estimatedItemSize={162}
      />

      {/* ── "View All Deals" CTA — always visible below the rail ── */}
      {onViewAll && (
        <View style={va.wrap}>
          <Pressable
            onPress={handleViewAll}
            accessibilityRole="button"
            style={({ pressed }) => [va.btn, pressed && { opacity: 0.85 }]}>
            <LinearGradient
              colors={[theme.colors.red[600], theme.colors.red[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={va.grad}>
              <Ionicons name="flame" size={15} color={theme.colors.surface} />
              <UIText style={va.text}>{t("home.viewAll")}</UIText>
              <Ionicons name="chevron-back" size={15} color={theme.colors.surface} />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
});
