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
import { useRouter } from "expo-router";
import { AuthProvider, useAuth } from "@/features/auth";
import { useCartStore } from "@/stores/cart";
import { useOrderStore } from "@/stores/orders";
import { useWishlistStore } from "@/stores/wishlist";
import {
  NotificationBanner,
  useNotificationSync,
  usePushNotificationRegistration,
} from "@/features/notifications";
import { ErrorBoundary } from "@/shared/components";

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

// ─── Notification sync — single realtime channel + banner toast bridge ──────

function NotificationSync() {
  const { user } = useAuth();
  useNotificationSync(user?.id);
  return null;
}

// ─── Push notification registration + deep-link routing ──────────────────────

function PushBootstrap() {
  const { user } = useAuth();
  const router   = useRouter();

  usePushNotificationRegistration({
    userId: user?.id,
    enabled: !!user?.id,
    onNotificationTap: (actionUrl) => {
      if (actionUrl) router.push(actionUrl as any);
    },
  });

  return null;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const hydrate         = useCartStore((s) => s.hydrate);
  const hydrateOrders   = useOrderStore((s) => s.hydrate);
  const hydrateWishlist = useWishlistStore((s) => s.hydrate);

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    Cairo_900Black,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    if (!I18nManager.isRTL) I18nManager.forceRTL(true);
    Promise.all([hydrate(), hydrateOrders(), hydrateWishlist()])
      .catch(() => {})
      .finally(() => SplashScreen.hideAsync());
  }, [fontsLoaded, hydrate, hydrateOrders, hydrateWishlist]);

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <NotificationSync />
            <PushBootstrap />
            <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
              <Stack.Screen name="index"                  options={{ headerShown: false }} />
              <Stack.Screen name="onboarding"             options={{ headerShown: false, animation: "fade" }} />
              <Stack.Screen name="(tabs)"                 options={{ headerShown: false }} />
              <Stack.Screen name="(auth)"                 options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="product/[id]"           options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="category/[id]"          options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="checkout"               options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="orders"                 options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="favorites"              options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="addresses"              options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="notifications"          options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="notification-preferences" options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="payment"                options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="faq"                    options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="loyalty"                 options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="about"                  options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="privacy"                options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="terms"                  options={{ headerShown: false, animation: "slide_from_right" }} />
            </Stack>
            <NotificationBanner />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
