/**
 * Manual payment UI — Vodafone Cash / InstaPay transfer verification.
 */

import React, { memo } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "@/components/ui/Input";
import { theme } from "@/theme";
import { MANUAL_PAYMENT_WALLET_NUMBER } from "../constants";

export interface ManualPaymentPanelProps {
  transferNumber: string;
  onTransferNumberChange: (value: string) => void;
  receiptUri: string | null;
  onPickReceipt: () => void;
  uploading?: boolean;
  error?: string | null;
}

export const ManualPaymentPanel = memo(function ManualPaymentPanel({
  transferNumber,
  onTransferNumberChange,
  receiptUri,
  onPickReceipt,
  uploading,
  error,
}: ManualPaymentPanelProps) {
  const copyNumber = async () => {
    try {
      await Clipboard.setStringAsync(MANUAL_PAYMENT_WALLET_NUMBER);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      Alert.alert("تم النسخ", "تم نسخ رقم المحفظة إلى الحافظة.");
    } catch {
      Alert.alert("تعذّر النسخ", "لم نتمكن من نسخ الرقم. انسخه يدوياً.");
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        أرسل المبلغ إلى رقم المحفظة ثم أدخل رقم المرسل وارفق صورة الإيصال.
      </Text>

      <View style={styles.numberBlock}>
        <Text style={styles.walletNumber}>{MANUAL_PAYMENT_WALLET_NUMBER}</Text>
        <Pressable
          onPress={copyNumber}
          accessibilityRole="button"
          accessibilityLabel="نسخ رقم المحفظة"
          style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.85 }]}>
          <Ionicons name="copy-outline" size={18} color="#fff" />
          <Text style={styles.copyBtnText}>نسخ</Text>
        </Pressable>
      </View>

      <Input
        label="رقم هاتف المرسل أو معرف إنستاباي"
        value={transferNumber}
        onChangeText={onTransferNumberChange}
        placeholder="01XXXXXXXXX أو InstaPay handle"
        keyboardType="default"
        autoCapitalize="none"
        error={error && !transferNumber.trim() ? error : undefined}
      />

      <Text style={styles.uploadLabel}>لقطة شاشة التحويل</Text>
      <Pressable
        onPress={onPickReceipt}
        disabled={uploading}
        style={({ pressed }) => [
          styles.uploadBox,
          receiptUri && styles.uploadBoxFilled,
          pressed && { opacity: 0.9 },
          uploading && { opacity: 0.6 },
        ]}>
        {receiptUri ? (
          <Image source={{ uri: receiptUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="image-outline" size={32} color={theme.colors.slate[400]} />
            <Text style={styles.uploadPlaceholderText}>اضغط لاختيار صورة الإيصال</Text>
          </View>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  hint: {
    fontSize: 12,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[600],
    textAlign: "right",
    lineHeight: 18,
  },
  numberBlock: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.brand[50],
    borderWidth: 1,
    borderColor: theme.colors.border.brandSoft,
  },
  walletNumber: {
    fontSize: 32,
    fontFamily: theme.fonts.black,
    color: theme.colors.brand[800],
    letterSpacing: 1,
    textAlign: "center",
  },
  copyBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.brand[600],
  },
  copyBtnText: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: "#fff",
  },
  uploadLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.secondary,
    textAlign: "right",
  },
  uploadBox: {
    minHeight: 160,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    borderStyle: "dashed",
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceSunken,
  },
  uploadBoxFilled: {
    borderStyle: "solid",
  },
  uploadPlaceholder: {
    flex: 1,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 20,
  },
  uploadPlaceholderText: {
    fontSize: 12,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[500],
    textAlign: "center",
  },
  preview: {
    width: "100%",
    height: 200,
  },
  errorText: {
    fontSize: 12,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.error.strong,
    textAlign: "right",
  },
});
