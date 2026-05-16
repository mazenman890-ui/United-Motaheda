import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { signIn } from "@/services/authApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Hero header */}
        <LinearGradient
          colors={theme.gradients.heroPrimary as [string, string, string]}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          {/* Close button */}
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.80)" />
          </Pressable>

          {/* Logo */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <View style={styles.logoCard}>
              <Image
                source={require("../../assets/logo.png")}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
          </View>

          <View style={{ alignItems: "center", marginTop: 20, paddingBottom: 32 }}>
            <Text style={{ color: "#fff", fontSize: 22, fontFamily: theme.fonts.black }}>مرحباً بعودتك</Text>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 4 }}>سجّل دخولك للمتابعة</Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <View style={styles.formCard}>
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error.base} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="البريد الإلكتروني"
            placeholder="example@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Ionicons name="mail-outline" size={18} color={theme.colors.text.tertiary} />}
          />

          <Input
            label="كلمة المرور"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.colors.text.tertiary} />}
            rightIcon={
              <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={theme.colors.text.tertiary} />
              </Pressable>
            }
          />

          <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleLogin} gradient style={{ marginTop: 8 }}>
            تسجيل الدخول
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.divider} />
          </View>

          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 14, color: theme.colors.text.secondary }}>ليس لديك حساب؟</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={{ fontSize: 14, fontFamily: theme.fonts.black, color: theme.colors.brand[700] }}>
                  إنشاء حساب جديد
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: theme.colors.bg },
  hero:     { paddingHorizontal: theme.layout.pagePaddingH, paddingBottom: 0, overflow: "hidden", position: "relative" },
  closeBtn: { position: "absolute", top: 16, left: theme.layout.pagePaddingH, width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.glass, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.glassBorder },
  logoCard: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, ...theme.shadow.lg },
  logo:     { width: 180, height: 72 },
  formCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20, flex: 1, padding: theme.layout.pagePaddingH, paddingTop: 28, gap: 16, ...theme.shadow.xl },
  errorBox: { flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: theme.colors.error.bg, borderRadius: theme.radius.lg, padding: 12, borderWidth: 1, borderColor: theme.colors.error.light },
  errorText:{ fontSize: 13, fontFamily: theme.fonts.semibold, color: theme.colors.error.text, flex: 1, textAlign: "right" },
  dividerRow:{ flexDirection: "row", alignItems: "center", gap: 12 },
  divider:  { flex: 1, height: 1, backgroundColor: theme.colors.border.default },
  dividerText: { fontSize: 12, color: theme.colors.text.tertiary, fontFamily: theme.fonts.semibold },
});
