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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { signUp } from "@/services/authApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

export default function RegisterScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("يرجى ملء جميع الحقول");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient
          colors={[theme.colors.hero, theme.colors.heroMid, theme.colors.heroBright]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop:        insets.top + 30,
            paddingBottom:     52,
            paddingHorizontal: 24,
            alignItems:        "center",
            gap:               14,
          }}>

          {/* Close */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              position: "absolute",
              top:      insets.top + 12,
              left:     16,
            }}>
            <View
              style={{
                width:           36,
                height:          36,
                borderRadius:    11,
                backgroundColor: "rgba(255,255,255,0.14)",
                alignItems:      "center",
                justifyContent:  "center",
              }}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.8)" />
            </View>
          </Pressable>

          {/* Logo */}
          <View
            style={{
              width:           82,
              height:          82,
              borderRadius:    28,
              backgroundColor: "rgba(255,255,255,0.14)",
              alignItems:      "center",
              justifyContent:  "center",
              borderWidth:     2,
              borderColor:     "rgba(255,255,255,0.28)",
              ...theme.shadow.md,
            }}>
            <MaterialCommunityIcons name="pill" size={40} color="#fff" />
          </View>

          <View style={{ alignItems: "center", gap: 5 }}>
            <Text style={{ color: "#fff", fontSize: 23, fontWeight: "900" }}>حساب جديد</Text>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
              أنشئ حسابك في ثوانٍ
            </Text>
          </View>

          {/* Progress dots */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3].map((d) => (
              <View
                key={d}
                style={{
                  width:           d === 1 ? 22 : 6,
                  height:          6,
                  borderRadius:    3,
                  backgroundColor: d === 1 ? "#fff" : "rgba(255,255,255,0.30)",
                }}
              />
            ))}
          </View>
        </LinearGradient>

        {/* Form card */}
        <View
          style={{
            marginTop:        -22,
            marginHorizontal: 16,
            backgroundColor:  "#fff",
            borderRadius:     theme.radius["2xl"],
            padding:          24,
            gap:              14,
            ...theme.shadow.lg,
            borderWidth:      1,
            borderColor:      "rgba(0,0,0,0.04)",
          }}>
          <Input
            label="الاسم الكامل"
            value={name}
            onChangeText={setName}
            placeholder="محمد أحمد"
            leftIcon={
              <Ionicons name="person-outline" size={16} color={theme.colors.slate[400]} />
            }
          />
          <Input
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="example@email.com"
            textAlign="left"
            leftIcon={
              <Ionicons name="mail-outline" size={16} color={theme.colors.slate[400]} />
            }
          />
          <Input
            label="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            placeholder="••••••••  (6 أحرف على الأقل)"
            leftIcon={
              <Ionicons name="lock-closed-outline" size={16} color={theme.colors.slate[400]} />
            }
            rightIcon={
              <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showPass ? "eye-outline" : "eye-off-outline"}
                  size={16}
                  color={theme.colors.slate[400]}
                />
              </Pressable>
            }
          />

          {error ? (
            <View
              style={{
                backgroundColor: "#fef2f2",
                borderRadius:    theme.radius.lg,
                padding:         13,
                flexDirection:   "row-reverse",
                alignItems:      "flex-start",
                gap:             9,
                borderWidth:     1,
                borderColor:     "#fecaca",
              }}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
              <Text
                style={{
                  color:      theme.colors.error,
                  fontSize:   13,
                  fontWeight: "600",
                  textAlign:  "right",
                  flex:       1,
                  lineHeight: 19,
                }}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleRegister}>
            إنشاء الحساب
          </Button>
        </View>

        {/* Login link */}
        <View
          style={{
            flexDirection:  "row",
            justifyContent: "center",
            alignItems:     "center",
            gap:            6,
            marginTop:      22,
            paddingHorizontal: 16,
          }}>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={{ color: theme.colors.brand[600], fontWeight: "800", fontSize: 14 }}>
              تسجيل الدخول
            </Text>
          </Pressable>
          <Text style={{ color: theme.colors.slate[400], fontSize: 14 }}>لديك حساب بالفعل؟</Text>
        </View>

        <View style={{ flex: 1, minHeight: 32 }} />

        <View style={{ alignItems: "center", paddingBottom: insets.bottom + 22 }}>
          <Text style={{ color: theme.colors.slate[400], fontSize: 11, textAlign: "center" }}>
            بمتابعتك فأنت توافق على سياسة الخصوصية وشروط الاستخدام
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
