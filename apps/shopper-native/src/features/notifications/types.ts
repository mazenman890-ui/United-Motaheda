/**
 * Notification domain types.
 *
 * Mirrors the Supabase `notifications` table but uses camelCase + ISO date
 * strings on the TS side. Conversion happens in `api.ts`.
 */

export type NotifType = "order" | "offer" | "health" | "system";

export type NotifCategory =
  | "order_updates"
  | "promotions"
  | "security_alerts"
  | "health_reminders"
  | "new_arrivals"
  | "account_updates";

export interface AppNotification {
  id:         string;
  userId:     string;
  type:       NotifType;
  category:   NotifCategory | null;
  title:      string;
  body:       string;
  data:       Record<string, unknown>;
  actionUrl:  string | null;
  isRead:     boolean;
  createdAt:  string;
}

export interface NotificationChannelPrefs {
  push:  boolean;
  email: boolean;
  sms:   boolean;
}

export interface NotificationCategoryPrefs {
  order_updates:    boolean;
  promotions:       boolean;
  security_alerts:  boolean;
  health_reminders: boolean;
  new_arrivals:     boolean;
  account_updates:  boolean;
}

export interface NotificationPreferences {
  channels:   NotificationChannelPrefs;
  categories: NotificationCategoryPrefs;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: {
    push:  true,
    email: true,
    sms:   false,
  },
  categories: {
    order_updates:    true,
    promotions:       true,
    security_alerts:  true,
    health_reminders: true,
    new_arrivals:     true,
    account_updates:  true,
  },
};

/** Pagination cursor for infinite scrolling. */
export interface NotificationPage {
  items:    AppNotification[];
  nextCursor: string | null;
}

export interface PushTokenRecord {
  id:             string;
  userId:         string;
  expoPushToken:  string;
  platform:       "ios" | "android" | "web";
  deviceId?:      string;
  appVersion?:    string;
  lastSeenAt:     string;
  createdAt:      string;
}
