/**
 * Screen — root wrapper for full-page surfaces.
 *
 * Handles:
 *  - safe-area padding (top/bottom)
 *  - default background color
 *  - optional ScrollView wrapping
 *  - optional KeyboardAvoidingView for form screens
 *
 * Replaces the repeated <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
 * + insets math + KeyboardAvoidingView boilerplate found in 15+ screens.
 */

import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/shared/theme";

interface ScreenProps {
  children: React.ReactNode;
  /** Wrap children in a ScrollView. */
  scroll?: boolean;
  /** Wrap in KeyboardAvoidingView (use for forms). */
  keyboardAvoiding?: boolean;
  /** Apply safe-area top padding. */
  edgeTop?: boolean;
  /** Apply safe-area bottom padding. */
  edgeBottom?: boolean;
  /** Override background color. Defaults to theme.colors.bg. */
  background?: string;
  /** Style applied to the root view. */
  style?: StyleProp<ViewStyle>;
  /** Style applied to the inner content (or ScrollView contentContainer). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Forwarded to ScrollView when scroll is true. */
  scrollProps?: Omit<ScrollViewProps, "children" | "contentContainerStyle">;
}

export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  edgeTop = false,
  edgeBottom = false,
  background,
  style,
  contentStyle,
  scrollProps,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = edgeTop ? insets.top : 0;
  const paddingBottom = edgeBottom ? insets.bottom : 0;

  const rootStyle: StyleProp<ViewStyle> = [
    styles.root,
    { backgroundColor: background ?? theme.colors.bg, paddingTop, paddingBottom },
    style,
  ];

  let content: React.ReactNode = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      contentContainerStyle={contentStyle}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.inner, contentStyle]}>{children}</View>
  );

  if (keyboardAvoiding) {
    content = (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={rootStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  inner: { flex: 1 },
});
