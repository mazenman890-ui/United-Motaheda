import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface MenuItem {
  iconName:  IoniconsName;
  iconColor: string;
  iconBg:    string;
  label:     string;
  badge?:    string;
  onPress:   () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const ACCOUNT_ITEMS: MenuItem[] = [
    {
      iconName:  "bag-handle-outline",
      iconColor: theme.colors.brand[600],
      iconBg:    theme.colors.brand[50],
      label:     "طلباتي",
      onPress:   () => {},
    },
    {
      iconName:  "heart-outline",
      iconColor: "#E11D48",
      iconBg:    "#FFF1F2",
      label:     "المفضلة",
      onPress:   () => {},
    },
    {
      iconName:  "location-outline",
      iconColor: "#7C3AED",
      iconBg:    "#F5F3FF",
      label:     "عناويني",
      onPress:   () => {},
    },
    {
      iconName:  "notifications-outline",
      iconColor: "#D97706",
      iconBg:    "#FFFBEB",
      label:     "الإشعارات",
      onPress:   () => {},
    },
  ];

  const SUPPORT_ITEMS: MenuItem[] = [
    {
      iconName:  "information-circle-outline",
      iconColor: "#0284C7",
      iconBg:    "#F0F9FF",
      label:     "عن الصيدلية",
      onPress:   () => {},
    },
    {
      iconName:  "logo-whatsapp",
      iconColor: "#25D366",
      iconBg:    "#F0FDF4",
      label:     "تواصل معنا",
      onPress:   () => {},
    },
    {
      iconName:  "lock-closed-outline",
      iconColor: "#64748B",
      iconBg:    "#F8FAFC",
      label:     "سياسة الخصوصية",
      onPress:   () => {},
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>

      {/* Hero */}
      <LinearGradient
        colors={[theme.colors.hero, theme.colors.heroMid, theme.colors.heroBright]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop:        insets.top + 24,
          paddingBottom:     52,
          paddingHorizontal: 24,
          alignItems:        "center",
          gap:               14,
        }}>

        {/* Avatar */}
        <View
          style={{
            width:           90,
            height:          90,
            borderRadius:    45,
            backgroundColor: "rgba(255,255,255,0.14)",
            alignItems:      "center",
            justifyContent:  "center",
            borderWidth:     2.5,
            borderColor:     "rgba(255,255,255,0.30)",
          }}>
          <Ionicons name="person-circle-outline" size={54} color="rgba(255,255,255,0.88)" />
        </View>

        {user ? (
          <>
            <View style={{ alignItems: "center", gap: 5 }}>
              <Text style={{ color: "#fff", fontSize: 21, fontWeight: "900" }}>
                {user.name ?? "مرحباً"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.60)", fontSize: 13 }}>
                {user.email}
              </Text>
            </View>
            <View
              style={{
                flexDirection:     "row",
                alignItems:        "center",
                gap:               5,
                backgroundColor:   "rgba(255,255,255,0.12)",
                borderRadius:      theme.radius.full,
                paddingHorizontal: 14,
                paddingVertical:   6,
                borderWidth:       1,
                borderColor:       "rgba(255,255,255,0.20)",
              }}>
              <Ionicons name="checkmark-circle" size={12} color="rgba(255,255,255,0.88)" />
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" }}>
                عضو موثق
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ color: "#fff", fontSize: 21, fontWeight: "900" }}>مرحباً بك</Text>
              <Text style={{ color: "rgba(255,255,255,0.60)", fontSize: 13 }}>
                سجل دخولك للوصول لحسابك
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={({ pressed }) => ({
                  backgroundColor:   "#fff",
                  borderRadius:      theme.radius.lg,
                  paddingHorizontal: 22,
                  paddingVertical:   11,
                  opacity:           pressed ? 0.88 : 1,
                  ...theme.shadow.md,
                })}>
                <Text style={{ color: theme.colors.brand[700], fontWeight: "900", fontSize: 14 }}>
                  تسجيل الدخول
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(auth)/register")}
                style={({ pressed }) => ({
                  backgroundColor:   "rgba(255,255,255,0.14)",
                  borderRadius:      theme.radius.lg,
                  paddingHorizontal: 22,
                  paddingVertical:   11,
                  borderWidth:       1.5,
                  borderColor:       "rgba(255,255,255,0.35)",
                  opacity:           pressed ? 0.88 : 1,
                })}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                  حساب جديد
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </LinearGradient>

      {/* Menu sections */}
      <View style={{ marginTop: -22, paddingHorizontal: 16, gap: 14 }}>
        {user && <MenuSection title="حسابي" items={ACCOUNT_ITEMS} />}

        <MenuSection title="المساعدة والدعم" items={SUPPORT_ITEMS} />

        {user && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius:    theme.radius["2xl"],
              overflow:        "hidden",
              ...theme.shadow.sm,
              borderWidth:     1,
              borderColor:     "rgba(0,0,0,0.04)",
            }}>
            <Pressable
              onPress={signOut}
              style={({ pressed }) => ({
                flexDirection:     "row-reverse",
                alignItems:        "center",
                gap:               14,
                paddingVertical:   15,
                paddingHorizontal: 16,
                backgroundColor:   pressed ? "#FEF2F2" : "#fff",
              })}>
              <View
                style={{
                  width:           40,
                  height:          40,
                  borderRadius:    12,
                  backgroundColor: "#FEF2F2",
                  alignItems:      "center",
                  justifyContent:  "center",
                }}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              </View>
              <Text
                style={{
                  flex:       1,
                  fontSize:   14,
                  fontWeight: "700",
                  color:      theme.colors.error,
                  textAlign:  "right",
                }}>
                تسجيل الخروج
              </Text>
            </Pressable>
          </View>
        )}

        <Text
          style={{
            textAlign:  "center",
            color:      theme.colors.slate[400],
            fontSize:   11,
            marginTop:  8,
            lineHeight: 18,
          }}>
          United Motaheda v1.0.0{"\n"}جميع الحقوق محفوظة
        </Text>
      </View>
    </ScrollView>
  );
}

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize:      10,
          fontWeight:    "800",
          color:         theme.colors.slate[400],
          textAlign:     "right",
          paddingHorizontal: 4,
          letterSpacing: 0.8,
        }}>
        {title}
      </Text>
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius:    theme.radius["2xl"],
          overflow:        "hidden",
          ...theme.shadow.sm,
          borderWidth:     1,
          borderColor:     "rgba(0,0,0,0.04)",
        }}>
        {items.map((item, idx) => (
          <React.Fragment key={item.label}>
            <Pressable
              onPress={item.onPress}
              style={({ pressed }) => ({
                flexDirection:     "row-reverse",
                alignItems:        "center",
                gap:               14,
                paddingVertical:   14,
                paddingHorizontal: 16,
                backgroundColor:   pressed ? theme.colors.slate[50] : "#fff",
              })}>
              <View
                style={{
                  width:           40,
                  height:          40,
                  borderRadius:    12,
                  backgroundColor: item.iconBg,
                  alignItems:      "center",
                  justifyContent:  "center",
                }}>
                <Ionicons name={item.iconName} size={20} color={item.iconColor} />
              </View>
              <Text
                style={{
                  flex:       1,
                  fontSize:   14,
                  fontWeight: "600",
                  color:      theme.colors.slate[800],
                  textAlign:  "right",
                }}>
                {item.label}
              </Text>
              {item.badge && (
                <View
                  style={{
                    backgroundColor:   theme.colors.brand[600],
                    borderRadius:      theme.radius.full,
                    paddingHorizontal: 8,
                    paddingVertical:   3,
                  }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                    {item.badge}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-back" size={16} color={theme.colors.slate[300]} />
            </Pressable>
            {idx < items.length - 1 && (
              <View
                style={{
                  height:          1,
                  backgroundColor: theme.colors.slate[100],
                  marginHorizontal: 16,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
