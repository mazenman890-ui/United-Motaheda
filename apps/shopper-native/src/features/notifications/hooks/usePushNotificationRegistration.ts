/**
 * Push notification registration hook.
 *
 * Responsibilities:
 *  - Request iOS/Android permissions
 *  - Fetch the Expo push token
 *  - Register it against `notification_tokens` (idempotent upsert)
 *  - Configure the Android notification channel
 *  - Set the foreground handler so notifications surface while app is open
 *
 * IMPORTANT: This must run inside a Development Build or production build.
 * Expo SDK 53+ removed push support from Expo Go entirely — calling
 * getExpoPushTokenAsync() in Expo Go will throw.
 *
 * Deep linking: notification taps are routed via the response listener.
 * Pass `onNotificationTap` to handle navigation; the helper extracts the
 * `action_url` from notification data and falls back to no-op.
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { registerPushToken } from "../api";

// Foreground handler: show alert + play sound + show in tray even when active.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensurePermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === "granted";
}

async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Notifications",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0DB8A8",
    sound: "default",
  });
}

async function fetchExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    if (__DEV__) console.warn("[push] Skipping: not a physical device (simulator)");
    return null;
  }

  try {
    // Prefer the EAS projectId when available — required on SDK 50+
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      undefined;

    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch (err) {
    if (__DEV__) console.warn("[push] getExpoPushTokenAsync failed:", err);
    return null;
  }
}

interface Options {
  userId: string | undefined;
  enabled?: boolean;
  onNotificationTap?: (actionUrl: string | null, data: Record<string, unknown>) => void;
}

export function usePushNotificationRegistration({
  userId,
  enabled = true,
  onNotificationTap,
}: Options): void {
  const tapHandlerRef = useRef(onNotificationTap);
  tapHandlerRef.current = onNotificationTap;

  // Token registration
  useEffect(() => {
    if (Platform.OS === "web") return; // push registration not supported on web
    if (!enabled || !userId) return;

    let cancelled = false;

    (async () => {
      const granted = await ensurePermissions();
      if (!granted || cancelled) return;

      await configureAndroidChannel();

      const token = await fetchExpoPushToken();
      if (!token || cancelled) return;

      await registerPushToken({
        userId,
        expoPushToken: token,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
        appVersion: Constants.expoConfig?.version,
      });
    })().catch((err) => {
      if (__DEV__) console.warn("[push] registration error:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  // Response listener — fires on notification tap (foreground OR background)
  useEffect(() => {
    if (Platform.OS === "web") return; // response listeners are not supported on web reliably
    if (!enabled) return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      const actionUrl = typeof data.action_url === "string" ? data.action_url : null;
      tapHandlerRef.current?.(actionUrl, data);
    });

    return () => sub.remove();
  }, [enabled]);
}
