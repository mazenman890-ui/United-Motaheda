/**
 * Notifications API — Supabase-backed real-time notifications.
 *
 * Required Supabase setup (run once in SQL editor):
 * ─────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS public.notifications (
 *   id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *   type       TEXT NOT NULL CHECK (type IN ('order','offer','health','system')),
 *   title      TEXT NOT NULL,
 *   body       TEXT NOT NULL,
 *   data       JSONB    DEFAULT '{}',
 *   action_url TEXT,
 *   read       BOOLEAN  DEFAULT FALSE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX ON public.notifications(user_id);
 * CREATE INDEX ON public.notifications(created_at DESC);
 * ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
 *
 * -- Users see/update only their own
 * CREATE POLICY "users_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
 * CREATE POLICY "users_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
 *
 * -- Admins can see and insert all  (requires role in user_metadata)
 * CREATE POLICY "admins_all" ON public.notifications FOR ALL
 *   USING (auth.jwt()->'user_metadata'->>'role' IN ('admin','manager'));
 *
 * -- Enable realtime
 * ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
 *
 * -- RPC for broadcasting to all users (run as SECURITY DEFINER)
 * CREATE OR REPLACE FUNCTION broadcast_notification(
 *   p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}'
 * ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
 * BEGIN
 *   INSERT INTO public.notifications (user_id, type, title, body, data)
 *   SELECT id, p_type, p_title, p_body, p_data FROM auth.users;
 * END; $$;
 * GRANT EXECUTE ON FUNCTION broadcast_notification TO authenticated;
 */

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type NotifType = "order" | "offer" | "health" | "system";

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

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function fetchNotificationById(id: string): Promise<AppNotification | null> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .single();
  return (data as AppNotification | null) ?? null;
}

export async function markRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
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
      (payload) => onNew(payload.new as AppNotification),
    )
    .subscribe();
}
