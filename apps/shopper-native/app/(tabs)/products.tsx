import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCategories } from "@/services/productsApi";
import { CategoryCard } from "@/components/CategoryCard";
import { CategoryTileSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/theme";

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: categories = [], isLoading, refetch, isRefetching } =
    useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>

      {/* Header */}
      <View
        style={{
          paddingTop:        insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom:     14,
          backgroundColor:   "#fff",
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.slate[100],
          ...theme.shadow.sm,
        }}>
        <View
          style={{
            flexDirection:  "row-reverse",
            alignItems:     "center",
            justifyContent: "space-between",
          }}>
          <Text
            style={{
              fontSize:   20,
              fontWeight: "900",
              color:      theme.colors.slate[900],
            }}>
            الأصناف
          </Text>
          {categories.length > 0 && (
            <View
              style={{
                backgroundColor:   theme.colors.brand[50],
                borderRadius:      theme.radius.full,
                paddingHorizontal: 10,
                paddingVertical:   4,
                borderWidth:       1,
                borderColor:       theme.colors.brand[100],
              }}>
              <Text
                style={{
                  fontSize:   11,
                  color:      theme.colors.brand[700],
                  fontWeight: "800",
                }}>
                {categories.length} صنف
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Grid */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          keyExtractor={(k) => String(k)}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={() => (
            <View style={{ flex: 1 }}>
              <CategoryTileSkeleton />
            </View>
          )}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="grid-outline" size={42} color={theme.colors.brand[400]} />}
          title="لا توجد أصناف"
          description="لا توجد أصناف متاحة حالياً"
          actionLabel="تحديث"
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={categories}
          numColumns={2}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{
            padding:       14,
            paddingBottom: insets.bottom + 90,
          }}
          columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item, index }) => (
            <View style={{ flex: 1 }}>
              <CategoryTile
                name={item.name}
                nameEn={item.nameEn}
                gradientIdx={index}
                category={item}
                onPress={() =>
                  router.push({ pathname: "/category/[id]", params: { id: item.id } })
                }
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

function CategoryTile({
  name,
  gradientIdx,
  category,
  onPress,
}: {
  name:        string;
  nameEn:      string;
  gradientIdx: number;
  category:    { id: string; name: string; nameEn: string; count: number };
  onPress:     () => void;
}) {
  return (
    <CategoryCard
      category={category}
      gradientIdx={gradientIdx}
      lang="ar"
      variant="tile"
      onPress={onPress}
    />
  );
}
