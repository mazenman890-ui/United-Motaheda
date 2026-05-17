/**
 * Banner toast queue.
 *
 * Replaces the legacy store's banner state. A single canonical place
 * for the latest incoming notification to surface as a toast, separate
 * from the TanStack notification cache (which handles list state).
 *
 * Lifecycle:
 *   - On a new realtime notification, NotificationSync calls pushBanner()
 *   - NotificationBanner renders the current banner with a swipe-to-dismiss
 *   - User taps or auto-timeout fires dismissBanner()
 */

import { create } from "zustand";
import type { AppNotification } from "./types";

interface BannerState {
  banner: AppNotification | null;
  pushBanner:    (notif: AppNotification) => void;
  dismissBanner: () => void;
  reset:         () => void;
}

export const useBannerStore = create<BannerState>((set) => ({
  banner: null,
  pushBanner: (notif) => set({ banner: notif }),
  dismissBanner: () => set({ banner: null }),
  reset: () => set({ banner: null }),
}));
