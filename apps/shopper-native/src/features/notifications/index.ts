/**
 * Public surface of the notifications feature.
 * Consumers should import from "@/features/notifications" exclusively.
 */

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
