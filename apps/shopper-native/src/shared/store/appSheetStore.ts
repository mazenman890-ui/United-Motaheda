/**
 * AppSheet global store — controls the single app-wide action/error sheet.
 *
 * Import convenience helpers to show pre-styled sheets without wiring config:
 *   showErrorSheet("فشل التحميل", "تحقق من اتصالك وأعد المحاولة", { onRetry })
 *   showAuthSheet()
 *   showOutOfZoneSheet()
 *   showConfirmSheet("حذف العنصر", "هل تريد حذف هذا العنصر؟", () => delete())
 */

import { create } from "zustand";
import i18n from "i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppSheetType =
  | "error"
  | "warning"
  | "success"
  | "info"
  | "auth"
  | "out-of-zone"
  | "confirm"
  | "network";

export interface AppSheetAction {
  label:    string;
  onPress:  () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export interface AppSheetConfig {
  type:         AppSheetType;
  title:        string;
  message:      string;
  actions?:     AppSheetAction[];
  onDismiss?:   () => void;
  dismissible?: boolean;
}

interface AppSheetState {
  visible: boolean;
  config:  AppSheetConfig | null;
  show:    (config: AppSheetConfig) => void;
  hide:    () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppSheetStore = create<AppSheetState>((set, get) => ({
  visible: false,
  config:  null,
  show:    (config) => set({ visible: true, config }),
  hide:    () => {
    get().config?.onDismiss?.();
    set({ visible: false });
  },
}));

// ─── Convenience helpers (call from anywhere — no hook needed) ───────────────

export function showErrorSheet(
  title:   string,
  message: string,
  opts?:   { onRetry?: () => void; dismissible?: boolean },
) {
  useAppSheetStore.getState().show({
    type:        "error",
    title,
    message,
    dismissible: opts?.dismissible ?? true,
    actions:     opts?.onRetry
      ? [
          {
            label:   i18n.t("common.retry"),
            variant: "primary",
            onPress: () => { useAppSheetStore.getState().hide(); opts.onRetry!(); },
          },
          {
            label:   i18n.t("common.close"),
            variant: "ghost",
            onPress: () => useAppSheetStore.getState().hide(),
          },
        ]
      : [
          {
            label:   i18n.t("common.ok"),
            variant: "primary",
            onPress: () => useAppSheetStore.getState().hide(),
          },
        ],
  });
}

export function showAuthSheet(onLoginPress?: () => void, onRegisterPress?: () => void) {
  useAppSheetStore.getState().show({
    type:        "auth",
    title:       i18n.t("sheet.authTitle"),
    message:     i18n.t("sheet.authMessage"),
    dismissible: true,
    actions: [
      {
        label:   i18n.t("auth.login"),
        variant: "primary",
        onPress: () => {
          useAppSheetStore.getState().hide();
          setTimeout(() => onLoginPress?.(), 300);
        },
      },
      {
        label:   i18n.t("auth.createAccount"),
        variant: "secondary",
        onPress: () => {
          useAppSheetStore.getState().hide();
          setTimeout(() => onRegisterPress?.(), 300);
        },
      },
    ],
  });
}

export function showOutOfZoneSheet() {
  useAppSheetStore.getState().show({
    type:        "out-of-zone",
    title:       i18n.t("sheet.outOfZoneTitle"),
    message:     i18n.t("sheet.outOfZoneMessage"),
    dismissible: true,
    actions:     [
      {
        label:   i18n.t("common.gotIt"),
        variant: "primary",
        onPress: () => useAppSheetStore.getState().hide(),
      },
    ],
  });
}

export function showNetworkSheet(onRetry?: () => void) {
  useAppSheetStore.getState().show({
    type:        "network",
    title:       i18n.t("sheet.networkTitle"),
    message:     i18n.t("sheet.networkMessage"),
    dismissible: true,
    actions:     onRetry
      ? [
          {
            label:   i18n.t("common.retry"),
            variant: "primary",
            onPress: () => { useAppSheetStore.getState().hide(); onRetry(); },
          },
        ]
      : [
          {
            label:   i18n.t("common.ok"),
            variant: "primary",
            onPress: () => useAppSheetStore.getState().hide(),
          },
        ],
  });
}

export function showConfirmSheet(
  title:     string,
  message:   string,
  onConfirm: () => void,
  opts?: {
    confirmLabel?: string;
    cancelLabel?:  string;
    danger?:       boolean;
  },
) {
  useAppSheetStore.getState().show({
    type:        "confirm",
    title,
    message,
    dismissible: true,
    actions:     [
      {
        label:   opts?.confirmLabel ?? i18n.t("common.confirm"),
        variant: opts?.danger ? "danger" : "primary",
        onPress: () => { useAppSheetStore.getState().hide(); onConfirm(); },
      },
      {
        label:   opts?.cancelLabel ?? i18n.t("sheet.cancel"),
        variant: "ghost",
        onPress: () => useAppSheetStore.getState().hide(),
      },
    ],
  });
}

export function showSuccessSheet(title: string, message: string, onOk?: () => void) {
  useAppSheetStore.getState().show({
    type:        "success",
    title,
    message,
    dismissible: true,
    actions:     [
      {
        label:   i18n.t("common.ok"),
        variant: "primary",
        onPress: () => { useAppSheetStore.getState().hide(); onOk?.(); },
      },
    ],
  });
}
