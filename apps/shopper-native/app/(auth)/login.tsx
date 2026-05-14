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
import { Ionicons } from "@expo/vector-icons";
import { signIn } from "@/services/authApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";
import { theme } from "@/theme";

export default function LoginScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
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
            paddingTop:        insets.top + 28,
            paddingBottom:     56,
            paddingHorizontal: 24,
            alignItems:        "center",
            gap:               16,
          }}>

          {/* Decorative grid lines */}
          <View
            style={{
              position:        "absolute",
              top:             0,
              left:            0,
              right:           0,
              bottom:          0,
              opacity:         0.04,
            }}
            pointerEvents="none">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  position:        "absolute",
                  left:            `${i * 33}%` as unknown as number,
                  top:             0,
                  bottom:          0,
                  width:           1,
                  backgroundColor: "#fff",
                }}
              />
            ))}
          </View>

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
                backgroundColor: "rgba(255,255,255,0.10)",
                alignItems:      "center",
                justifyContent:  "center",
                borderWidth:     1,
                borderColor:     "rgba(255,255,255,0.14)",
              }}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.75)" />
            </View>
          </Pressable>

          {/* Brand mark */}
          <BrandMark size="lg" variant="onHero" showText showSlogan />
        </LinearGradient>

        {/* Form card */}
        <View
          style={{
            marginTop:        -24,
            marginHorizontal: 16,
            backgroundColor:  "#fff",
            borderRadius:     theme.radius["2xl"],
            padding:          24,
            gap:              14,
            ...theme.shadow.lg,
            borderWidth:      1,
            borderColor:      "rgba(0,0,0,0.04)",
          }}>

          <Text
            style={{
              fontSize:   18,
              fontFamily: theme.fonts.black,
              color:      theme.colors.slate[900],
              textAlign:  "right",
              marginBottom: 2,
            }}>
            تسجيل الدخول
          </Text>

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
            placeholder="••••••••"
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

          <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleLogin}>
            تسجيل الدخول
          </Button>
        </View>

        {/* Register link */}
        <View
          style={{
            flexDirection:  "row",
            justifyContent: "center",
            alignItems:     "center",
            gap:            6,
            marginTop:      22,
            paddingHorizontal: 16,
          }}>
          <Pressable onPress={() => router.replace("/(auth)/register")}>
            <Text style={{ color: theme.colors.brand[600], fontWeight: "800", fontSize: 14 }}>
              إنشاء حساب جديد
            </Text>
          </Pressable>
          <Text style={{ color: theme.colors.slate[400], fontSize: 14 }}>ليس لديك حساب؟</Text>
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
