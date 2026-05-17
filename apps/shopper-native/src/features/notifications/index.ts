/**
 * Public surface of the notifications feature.
 * Consumers should import from "@/features/notifications" exclusively.
 */

// ─── Canonical (camelCase) surface ──────────────────────────────────────────
export * from "./types";
export {
  fetchNotificationsPage,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  registerPushToken,
  unregisterPushToken,
} from "./api";
export { subscribeToNotifications } from "./realtime";
export { useNotifications } from "./hooks/useNotifications";
export { useNotificationPreferences } from "./hooks/useNotificationPreferences";
export { usePushNotificationRegistration } from "./hooks/usePushNotificationRegistration";

// ─── Legacy surface (banner toast + tab badge state) ────────────────────────
// Kept for backward compatibility with NotificationBanner + _layout sync +
// tab badges. These will be consolidated into the TanStack hook in a future
// pass once the banner state is moved into a shared toast queue.
export { useNotificationStore, selectUnreadCount } from "./legacy-store";
export { NotificationBanner } from "./components/NotificationBanner";
