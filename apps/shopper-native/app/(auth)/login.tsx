import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signIn } from "@/services/authApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("يرجى إدخال البريد الإلكتروني وكلمة المرور"); return; }
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password);
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "بيانات غير صحيحة. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#fff" }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <LinearGradient
          colors={[theme.colors.brand[600], theme.colors.brand[800]]}
          style={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 24, alignItems: "center", gap: 10 }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 36 }}>💊</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>United Motaheda</Text>
          <Text style={{ color: "rgba(255,255,255,0.70)", fontSize: 14 }}>سجل دخولك للمتابعة</Text>
        </LinearGradient>

        {/* Form */}
        <View style={{ padding: 24, gap: 18, flex: 1 }}>
          <Input
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="example@email.com"
            textAlign="left"
          />
          <Input
            label="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          {error ? (
            <View style={{ backgroundColor: "#fef2f2", borderRadius: 10, padding: 12 }}>
              <Text style={{ color: theme.colors.error, fontSize: 13, fontWeight: "600", textAlign: "right" }}>{error}</Text>
            </View>
          ) : null}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleLogin}>
            تسجيل الدخول
          </Button>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 4 }}>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={{ color: theme.colors.brand[600], fontWeight: "700", fontSize: 14 }}>إنشاء حساب جديد</Text>
            </Pressable>
            <Text style={{ color: theme.colors.slate[400], fontSize: 14 }}>ليس لديك حساب؟</Text>
          </View>
        </View>

        {/* Close */}
        <Pressable
          onPress={() => router.back()}
          style={{ alignSelf: "center", paddingVertical: 16, paddingBottom: insets.bottom + 16 }}>
          <Text style={{ color: theme.colors.slate[400], fontSize: 13 }}>إغلاق</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
