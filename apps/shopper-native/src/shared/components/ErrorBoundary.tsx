/**
 * ErrorBoundary — production-grade React error boundary.
 *
 * Catches render-phase exceptions in its subtree and displays a calm
 * Arabic-first recovery screen instead of a white crash. Used at:
 *  - app root (catches anything below QueryClientProvider)
 *  - any screen that wants its own isolated recovery surface
 *
 * Pairs with the runtime fallback patterns we've used per-feature
 * (e.g. CategoryStatsDock's error state). This boundary handles the
 * RENDER-phase failure mode — not network errors, which features
 * handle locally with try/catch.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/theme";

interface Props {
  children: React.ReactNode;
  /** Optional callback when an error is caught (e.g. for telemetry). */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Optional override for the recovery UI. */
  fallback?: (reset: () => void, error: Error) => React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error("[ErrorBoundary] caught:", error, info);
    }
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.reset, this.state.error);
      }
      return <DefaultFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="warning-outline" size={36} color={theme.colors.amber[600]} />
      </View>
      <Text style={styles.title}>حدث خطأ غير متوقع</Text>
      <Text style={styles.body}>
        نعتذر — حدث خطأ في تحميل هذه الصفحة. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.
      </Text>

      {__DEV__ && (
        <View style={styles.devBox}>
          <Text style={styles.devLabel}>Dev info:</Text>
          <Text style={styles.devText} selectable>
            {error.message}
          </Text>
        </View>
      )}

      <Pressable onPress={onReset} style={styles.btn}>
        <Ionicons name="refresh" size={14} color="#fff" />
        <Text style={styles.btnText}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: theme.colors.amber[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.amber[100],
  },
  title: {
    fontSize: 18,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
    textAlign: "center",
  },
  body: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  devBox: {
    alignSelf: "stretch",
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    marginTop: 8,
  },
  devLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.black,
    color: theme.colors.slate[500],
    marginBottom: 4,
  },
  devText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[700],
  },
  btn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.brand[600],
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 12,
    ...theme.shadow.brand,
  },
  btnText: {
    fontSize: 13,
    fontFamily: theme.fonts.black,
    color: "#fff",
  },
});
