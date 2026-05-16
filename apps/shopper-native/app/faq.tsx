import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { FAQAccordion } from "@/components/FAQAccordion";
import { FAQCategoryRail } from "@/components/FAQCategoryRail";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAQ_DATA, FAQ_CATEGORIES } from "@/types/faq";
import type { FAQCategory, FAQItem } from "@/types/faq";
import { theme } from "@/theme";

export default function FAQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<FAQCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<FAQCategory | "all", number> = { all: FAQ_DATA.length } as any;
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
        colors={["#011826", "#032B42", "#064D6E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.decoCircle} />

        <View style={styles.headerTopRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>مركز المساعدة</Text>
            <Text style={styles.headerSub}>{FAQ_DATA.length} سؤال في {FAQ_CATEGORIES.length} أقسام</Text>
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
            placeholder="ابحث في الأسئلة الشائعة…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.searchInput}
            textAlign="right"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
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
              <Text style={styles.resultCountText}>
                {filtered.length} {filtered.length === 1 ? "نتيجة" : "نتيجة"}
                {query ? ` لـ "${query}"` : ""}
              </Text>
            </Animated.View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 40 }}>
            <EmptyState
              icon="help-circle-outline"
              title="لا توجد نتائج"
              description={query ? "جرب كلمات بحث مختلفة" : "لا توجد أسئلة في هذا القسم"}
            />
          </View>
        }
      />

      {/* ── Contact CTA ── */}
      <Animated.View entering={FadeInDown.duration(300)} style={[styles.contactBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.contactContent}>
          <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.brand[600]} />
          <Text style={styles.contactText}>لم تجد إجابتك؟</Text>
          <Pressable style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>تواصل معنا</Text>
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
    position: "absolute",
    left: -30,
    top: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  headerTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.black,
    color: "#fff",
    textAlign: "right",
  },
  headerSub: {
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: "rgba(255,255,255,0.50)",
    textAlign: "right",
  },
  helpIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "#fff",
    paddingVertical: 0,
  },

  // Rail
  railWrap: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
    backgroundColor: theme.colors.bg,
  },

  // List
  list: { padding: 20, paddingBottom: 100 },
  resultCount: { marginBottom: 12 },
  resultCountText: {
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[400],
    textAlign: "right",
  },

  // Contact bar
  contactBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
    paddingTop: 12,
    paddingHorizontal: 20,
    ...theme.shadow.lg,
  },
  contactContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[500],
    textAlign: "right",
  },
  contactBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.brand[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  contactBtnText: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: theme.colors.brand[600],
  },
});
