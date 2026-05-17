/**
 * Realtime channel subscription for notifications.
 */

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AppNotification } from "./types";

interface NotificationRow {
  id:         string;
  user_id:    string;
  type:       string;
  category:   string | null;
  title:      string;
  body:       string;
  data:       unknown;
  action_url: string | null;
  is_read:    boolean;
  created_at: string;
}

export function subscribeToNotifications(
  userId: string,
  onNew: (n: AppNotification) => void,
): RealtimeChannel {
  return supabase
    .channel(`notifs-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as NotificationRow;
        onNew({
          id:        row.id,
          userId:    row.user_id,
          type:      (row.type as AppNotification["type"]) ?? "system",
          category:  (row.category as AppNotification["category"]) ?? null,
          title:     row.title,
          body:      row.body,
          data:      (row.data as Record<string, unknown>) ?? {},
          actionUrl: row.action_url,
          isRead:    row.is_read,
          createdAt: row.created_at,
        });
      },
    )
    .subscribe();
}
