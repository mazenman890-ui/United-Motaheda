import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  fetchNotifications,
  markRead as apiMarkRead,
  markAllRead as apiMarkAllRead,
  subscribeToNotifications,
  type AppNotification,
} from "@/services/notificationsApi";

interface NotificationsStore {
  notifications:  AppNotification[];
  loading:        boolean;
  banner:         AppNotification | null;

  fetch:         (userId: string) => Promise<void>;
  markRead:      (id: string) => void;
  markAllRead:   (userId: string) => void;
  subscribe:     (userId: string) => void;
  unsubscribe:   () => void;
  dismissBanner: () => void;
  pushLocal:     (n: AppNotification) => void;
  reset:         () => void;
}

let _channel: RealtimeChannel | null = null;

export const useNotificationStore = create<NotificationsStore>((set, get) => ({
  notifications: [],
  loading:       false,
  banner:        null,

  fetch: async (userId) => {
    set({ loading: true });
    try {
      const notifications = await fetchNotifications(userId);
      set({ notifications });
    } catch {
      // fail silently — notifications are non-critical
    } finally {
      set({ loading: false });
    }
  },

  markRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    }));
    apiMarkRead(id).catch(() => {});
  },

  markAllRead: (userId) => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
    apiMarkAllRead(userId).catch(() => {});
  },

  subscribe: (userId) => {
    if (_channel) return;
    _channel = subscribeToNotifications(userId, (n) => get().pushLocal(n));
  },

  unsubscribe: () => {
    _channel?.unsubscribe();
    _channel = null;
  },

  dismissBanner: () => set({ banner: null }),

  pushLocal: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications],
      banner:        n,
    })),

  reset: () => {
    get().unsubscribe();
    set({ notifications: [], loading: false, banner: null });
  },
}));

export const selectUnreadCount = (s: NotificationsStore) =>
  s.notifications.filter((n) => !n.read).length;
