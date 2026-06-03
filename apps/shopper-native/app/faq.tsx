import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { FAQAccordion, FAQCategoryRail } from "@/features/faq";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAQ_DATA, FAQ_CATEGORIES, type FAQCategory, type FAQItem } from "@/features/faq";
import { theme } from "@/shared/theme";

export default function FAQScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t }   = useTranslation();

  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<FAQCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: FAQ_DATA.length } as Record<FAQCategory | "all", number>;
    FAQ_CATEGORIES.forEach((cat) => {
      c[cat.key] = FAQ_DATA.filter((f) => f.category === cat.key).length;
    });
    return c;
  }, []);

  const filtered = useMemo(() => {
    let items = FAQ_DATA;
    if (selectedCat !== "all") {
      items = items.filter((f) => f.category === selectedCat);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
    }
    return items;
  }, [selectedCat, query]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const renderItem = useCallback(({ item, index }: { item: FAQItem; index: number }) => (
    <FAQAccordion
      item={item}
      index={index}
      expanded={expandedId === item.id}
      onToggle={() => handleToggle(item.id)}
    />
  ), [expandedId, handleToggle]);

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.decoCircle} />

        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <UIText style={styles.headerTitle}>{t("faq.title")}</UIText>
            <UIText style={styles.headerSub}>{t("faq.subtitle", { q: FAQ_DATA.length, c: FAQ_CATEGORIES.length })}</UIText>
          </View>
          <View style={styles.helpIcon}>
            <Ionicons name="help-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.50)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("faq.searchPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.searchInput}
            textAlign="right"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("faq.clearSearch")}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.50)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ── Category Rail (sticky) ── */}
      <View style={styles.railWrap}>
        <FAQCategoryRail
          selected={selectedCat}
          onSelect={setSelectedCat}
          counts={counts}
        />
      </View>

      {/* ── Content ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.resultCount}>
              <UIText style={styles.resultCountText}>
                {t("faq.resultCount", { count: filtered.length })}
                {query ? ` ${t("faq.forQuery", { q: query })}` : ""}
              </UIText>
            </Animated.View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 40 }}>
            <EmptyState
              icon="help-circle-outline"
              title={t("faq.noResults")}
              description={query ? t("faq.noResultsInQuery") : t("faq.noResultsInCat")}
            />
          </View>
        }
      />

      {/* ── Contact CTA ── */}
      <Animated.View entering={FadeInDown.duration(300)} style={[styles.contactBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.contactContent}>
          <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.brand[600]} />
          <UIText style={styles.contactText}>{t("faq.notFound")}</UIText>
          <Pressable style={styles.contactBtn}>
            <UIText style={styles.contactBtnText}>{t("faq.contactUs")}</UIText>
            <Ionicons name="arrow-back" size={12} color={theme.colors.brand[600]} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 14, overflow: "hidden" },
  decoCircle: {
    position:        "absolute",
    left:            -30,
    top:             -30,
    width:           110,
    height:          110,
    borderRadius:    55,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  headerTopRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    fontSize:   22,
    fontFamily: theme.fonts.black,
    color:      "#fff",
    textAlign:  "right",
  },
  headerSub: {
    fontSize:   11,
    fontFamily: theme.fonts.semibold,
    color:      "rgba(255,255,255,0.50)",
    textAlign:  "right",
  },
  helpIcon: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.10)",
  },
  searchBar: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               10,
    backgroundColor:   "rgba(255,255,255,0.10)",
    borderRadius:      16,
    paddingHorizontal: 14,
    paddingVertical:   11,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
  },
  searchInput: {
    flex:          1,
    fontSize:      13,
    fontFamily:    theme.fonts.regular,
    color:         "#fff",
    paddingVertical: 0,
  },

  // Rail
  railWrap: {
    paddingVertical:   12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
    backgroundColor:   theme.colors.bg,
  },

  // List
  list: { padding: 20, paddingBottom: 100 },
  resultCount: { marginBottom: 12 },
  resultCountText: {
    fontSize:   11,
    fontFamily: theme.fonts.semibold,
    color:      theme.colors.slate[400],
    textAlign:  "right",
  },

  // Contact bar
  contactBar: {
    position:         "absolute",
    bottom:           0,
    left:             0,
    right:            0,
    backgroundColor:  "#fff",
    borderTopWidth:   1,
    borderTopColor:   theme.colors.slate[100],
    paddingTop:       12,
    paddingHorizontal: 20,
    ...theme.shadow.lg,
  },
  contactContent: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           8,
  },
  contactText: {
    flex:       1,
    fontSize:   12,
    fontFamily: theme.fonts.semibold,
    color:      theme.colors.slate[500],
    textAlign:  "right",
  },
  contactBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   theme.colors.brand[50],
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      10,
  },
  contactBtnText: {
    fontSize:   11,
    fontFamily: theme.fonts.bold,
    color:      theme.colors.brand[600],
  },
});
