import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

type MenuItem = {
  iconName:  IoniconsName;
  iconColor: string;
  iconBg:    string;
  label:     string;
  onPress:   () => void;
};

const MENU_SECTIONS: { account: MenuItem[]; support: MenuItem[] } = {
  account: [
    { iconName: "bag-handle-outline", iconColor: theme.colors.brand[600], iconBg: theme.colors.brand[50], label: "طلباتي",  onPress: () => {} },
    { iconName: "heart-outline",      iconColor: "#e11d48",               iconBg: "#fff1f2",              label: "المفضلة", onPress: () => {} },
    { iconName: "location-outline",   iconColor: "#7c3aed",               iconBg: "#f5f3ff",              label: "عناويني", onPress: () => {} },
  ],
  support: [
    { iconName: "information-circle-outline", iconColor: "#0284c7", iconBg: "#f0f9ff", label: "عن الصيدلية",    onPress: () => {} },
    { iconName: "call-outline",               iconColor: "#16a34a", iconBg: "#f0fdf4", label: "تواصل معنا",     onPress: () => {} },
    { iconName: "lock-closed-outline",        iconColor: "#d97706", iconBg: "#fffbeb", label: "سياسة الخصوصية", onPress: () => {} },
  ],
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <LinearGradient
        colors={["#065f46", "#047857", "#059669"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 24, paddingBottom: 50, paddingHorizontal: 24, alignItems: "center", gap: 14 }}>

        <View style={{
          width:           88,
          height:          88,
          borderRadius:    44,
          backgroundColor: "rgba(255,255,255,0.15)",
          alignItems:      "center",
          justifyContent:  "center",
          borderWidth:     2.5,
          borderColor:     "rgba(255,255,255,0.35)",
        }}>
          <Ionicons name="person-circle-outline" size={54} color="rgba(255,255,255,0.9)" />
        </View>

        {user ? (
          <>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>{user.name ?? "مرحباً"}</Text>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{user.email}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: theme.radius.full, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}>
              <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" }}>عضو موثق</Text>
            </View>
          </>
        ) : (
          <>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>مرحباً بك</Text>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>سجل دخولك للوصول لحسابك</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={{ backgroundColor: "#fff", borderRadius: theme.radius.lg, paddingHorizontal: 20, paddingVertical: 10, ...theme.shadow.md }}>
                <Text style={{ color: theme.colors.brand[700], fontWeight: "800", fontSize: 13 }}>تسجيل الدخول</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(auth)/register")}
                style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: theme.radius.lg, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)" }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>حساب جديد</Text>
              </Pressable>
            </View>
          </>
        )}
      </LinearGradient>

      {/* Cards */}
      <View style={{ marginTop: -22, paddingHorizontal: 16, gap: 12 }}>

        {user && <MenuSection title="حسابي" items={MENU_SECTIONS.account} />}

        <MenuSection title="المساعدة والدعم" items={MENU_SECTIONS.support} />

        {user && (
          <View style={{ backgroundColor: "#fff", borderRadius: theme.radius.xl, overflow: "hidden", ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.slate[100] }}>
            <Pressable
              onPress={signOut}
              style={({ pressed }) => ({
                flexDirection:     "row-reverse",
                alignItems:        "center",
                gap:               14,
                paddingVertical:   14,
                paddingHorizontal: 16,
                backgroundColor:   pressed ? "#fef2f2" : "#fff",
              })}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: theme.colors.error, textAlign: "right" }}>
                تسجيل الخروج
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={{ textAlign: "center", color: theme.colors.slate[400], fontSize: 11, marginVertical: 16 }}>
          United Motaheda v1.0.0 — جميع الحقوق محفوظة
        </Text>
      </View>
    </ScrollView>
  );
}

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.slate[400], textAlign: "right", paddingHorizontal: 4, letterSpacing: 0.5, marginBottom: 2 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: "#fff", borderRadius: theme.radius.xl, overflow: "hidden", ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.slate[100] }}>
        {items.map((item, idx) => (
          <React.Fragment key={item.label}>
            <Pressable
              onPress={item.onPress}
              style={({ pressed }) => ({
                flexDirection:     "row-reverse",
                alignItems:        "center",
                gap:               14,
                paddingVertical:   13,
                paddingHorizontal: 16,
                backgroundColor:   pressed ? theme.colors.slate[50] : "#fff",
              })}>
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: item.iconBg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={item.iconName} size={19} color={item.iconColor} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.colors.slate[800], textAlign: "right" }}>
                {item.label}
              </Text>
              <Ionicons name="chevron-back" size={16} color={theme.colors.slate[300]} />
            </Pressable>
            {idx < items.length - 1 && (
              <View style={{ height: 1, backgroundColor: theme.colors.slate[100], marginHorizontal: 16 }} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
