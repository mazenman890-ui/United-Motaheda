import "../global.css";
import React, { useEffect } from "react";
import { I18nManager, Platform } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { useCartStore } from "@/stores/cart";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          5 * 60 * 1000,
      gcTime:             10 * 60 * 1000,
      retry:              2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const hydrate = useCartStore((s) => s.hydrate);

  useEffect(() => {
    // Force RTL for Arabic
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
    hydrate().then(() => SplashScreen.hideAsync());
  }, [hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
              <Stack.Screen name="(auth)"    options={{ headerShown: false, presentation: "modal" }} />
              <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="category/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="checkout"  options={{ headerShown: false, presentation: "modal" }} />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
