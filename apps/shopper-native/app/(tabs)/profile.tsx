import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

interface MenuItemProps {
  icon:    string;
  label:   string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection:   "row-reverse",
        alignItems:      "center",
        gap:             14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: pressed ? theme.colors.slate[50] : "#fff",
      })}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: danger ? "#fef2f2" : theme.colors.slate[100], alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: danger ? theme.colors.error : theme.colors.slate[800], textAlign: "right" }}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.slate[400], fontSize: 14 }}>←</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.slate[100] }}
      showsVerticalScrollIndicator={false}>

      {/* Avatar header */}
      <LinearGradient
        colors={[theme.colors.brand[600], theme.colors.brand[800]]}
        style={{ paddingTop: insets.top + 20, paddingBottom: 36, paddingHorizontal: 20, alignItems: "center", gap: 12 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.40)" }}>
          <Text style={{ fontSize: 36 }}>👤</Text>
        </View>
        {user ? (
          <>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>{user.name ?? "مرحباً"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>{user.email}</Text>
          </>
        ) : (
          <>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>مرحباً بك 👋</Text>
            <Text style={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>سجل دخول للوصول لحسابك</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <Button variant="secondary" size="sm" onPress={() => router.push("/(auth)/login")}>تسجيل الدخول</Button>
              <Button variant="outline" size="sm" onPress={() => router.push("/(auth)/register")} style={{ borderColor: "rgba(255,255,255,0.60)" }}>
                حساب جديد
              </Button>
            </View>
          </>
        )}
      </LinearGradient>

      <View style={{ marginTop: -20, marginHorizontal: 16, borderRadius: 20, backgroundColor: "#fff", overflow: "hidden", ...theme.shadow.md }}>
        {user && (
          <>
            <MenuItem icon="📦" label="طلباتي" onPress={() => {}} />
            <Divider />
            <MenuItem icon="❤️" label="المفضلة" onPress={() => {}} />
            <Divider />
            <MenuItem icon="📍" label="عناويني" onPress={() => {}} />
            <Divider />
          </>
        )}
        <MenuItem icon="ℹ️"  label="عن الصيدلية"  onPress={() => {}} />
        <Divider />
        <MenuItem icon="📞" label="تواصل معنا"    onPress={() => {}} />
        <Divider />
        <MenuItem icon="🔒" label="سياسة الخصوصية" onPress={() => {}} />
      </View>

      {user && (
        <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 20, backgroundColor: "#fff", overflow: "hidden", ...theme.shadow.sm }}>
          <MenuItem icon="🚪" label="تسجيل الخروج" onPress={signOut} danger />
        </View>
      )}

      {/* App version */}
      <Text style={{ textAlign: "center", color: theme.colors.slate[400], fontSize: 11, marginVertical: 24 }}>
        United Motaheda v1.0.0
      </Text>
    </ScrollView>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: theme.colors.slate[100], marginHorizontal: 16 }} />;
}
