import React, { useEffect } from "react";
import { I18nManager } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  Cairo_900Black,
} from "@expo-google-fonts/cairo";
import { AuthProvider } from "@/contexts/AuthContext";
import { useCartStore } from "@/stores/cart";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000,
      gcTime:               15 * 60 * 1000,
      retry:                1,
      refetchOnWindowFocus: false,
      refetchOnMount:       false,
    },
  },
});

export default function RootLayout() {
  const hydrate = useCartStore((s) => s.hydrate);

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    Cairo_900Black,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
    hydrate().then(() => SplashScreen.hideAsync());
  }, [fontsLoaded, hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
              <Stack.Screen name="index"         options={{ headerShown: false }} />
              <Stack.Screen name="onboarding"    options={{ headerShown: false, animation: "fade" }} />
              <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
              <Stack.Screen name="(auth)"        options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="product/[id]"  options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="category/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="checkout"      options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
