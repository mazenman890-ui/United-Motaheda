/**
 * Legacy notifications API — adapter over @/features/notifications.
 *
 * Kept for backward compatibility with NotificationBanner, _layout sync,
 * and tab badges. NEW code should import from "@/features/notifications".
 *
 * This adapter:
 *  - Maps the canonical `is_read` column to the legacy `read` field
 *  - Re-exports the realtime subscriber from the feature module
 *  - Forwards mutations to the feature API
 *
 * Schema reference (canonical, see supabase/migrations/20260516_notifications.sql):
 *   notifications(id, user_id, type, category, title, body, data, action_url,
 *                 is_read, created_at)
 */

import {
  fetchNotificationsPage,
  markNotificationRead,
  markAllNotificationsRead,
} from "./api";
import { subscribeToNotifications as featureSubscribe } from "./realtime";
import type { AppNotification as CanonicalNotification } from "./types";

export type NotifType = "order" | "offer" | "health" | "system";

/** Legacy shape with snake_case + `read` (not `isRead`). */
export interface AppNotification {
  id:         string;
  user_id:    string;
  type:       NotifType;
  title:      string;
  body:       string;
  data:       Record<string, unknown>;
  action_url: string | null;
  read:       boolean;
  created_at: string;
}

function toLegacy(n: CanonicalNotification): AppNotification {
  return {
    id:         n.id,
    user_id:    n.userId,
    type:       n.type,
    title:      n.title,
    body:       n.body,
    data:       n.data,
    action_url: n.actionUrl,
    read:       n.isRead,
    created_at: n.createdAt,
  };
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const page = await fetchNotificationsPage(userId, null, 60);
  return page.items.map(toLegacy);
}

export async function markRead(id: string): Promise<void> {
  await markNotificationRead(id);
}

export async function markAllRead(userId: string): Promise<void> {
  await markAllNotificationsRead(userId);
}

export function subscribeToNotifications(
  userId: string,
  onNew: (n: AppNotification) => void,
) {
  return featureSubscribe(userId, (canonical) => onNew(toLegacy(canonical)));
}
