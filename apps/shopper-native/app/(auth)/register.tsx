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
import { signUp } from "@/services/authApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password) { setError("يرجى ملء جميع الحقول"); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setLoading(true);
    setError("");
    try {
      await signUp(email.trim(), password, name.trim());
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ. حاول مرة أخرى");
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

        <LinearGradient
          colors={[theme.colors.brand[600], theme.colors.brand[800]]}
          style={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 24, alignItems: "center", gap: 10 }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 36 }}>✨</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>حساب جديد</Text>
          <Text style={{ color: "rgba(255,255,255,0.70)", fontSize: 14 }}>أنشئ حسابك في ثوانٍ</Text>
        </LinearGradient>

        <View style={{ padding: 24, gap: 16, flex: 1 }}>
          <Input
            label="الاسم الكامل"
            value={name}
            onChangeText={setName}
            placeholder="محمد أحمد"
            textAlign="right"
          />
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

          <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleRegister}>
            إنشاء الحساب
          </Button>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={{ color: theme.colors.brand[600], fontWeight: "700", fontSize: 14 }}>تسجيل الدخول</Text>
            </Pressable>
            <Text style={{ color: theme.colors.slate[400], fontSize: 14 }}>لديك حساب بالفعل؟</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{ alignSelf: "center", paddingVertical: 16, paddingBottom: insets.bottom + 16 }}>
          <Text style={{ color: theme.colors.slate[400], fontSize: 13 }}>إغلاق</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
