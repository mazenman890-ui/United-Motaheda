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
            label:   "حاول مرة أخرى",
            variant: "primary",
            onPress: () => { useAppSheetStore.getState().hide(); opts.onRetry!(); },
          },
          {
            label:   "إغلاق",
            variant: "ghost",
            onPress: () => useAppSheetStore.getState().hide(),
          },
        ]
      : [
          {
            label:   "حسناً",
            variant: "primary",
            onPress: () => useAppSheetStore.getState().hide(),
          },
        ],
  });
}

export function showAuthSheet(onLoginPress?: () => void, onRegisterPress?: () => void) {
  useAppSheetStore.getState().show({
    type:        "auth",
    title:       "تسجيل الدخول مطلوب",
    message:     "يرجى تسجيل الدخول أولاً للاستمرار في هذه الخطوة.",
    dismissible: true,
    actions: [
      {
        label:   "تسجيل الدخول",
        variant: "primary",
        onPress: () => {
          useAppSheetStore.getState().hide();
          setTimeout(() => onLoginPress?.(), 300);
        },
      },
      {
        label:   "إنشاء حساب جديد",
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
    title:       "خارج نطاق التوصيل",
    message:     "موقعك خارج نطاق خدمة التوصيل المتاحة حالياً.\nنخدم القاهرة فقط في الوقت الحالي.",
    dismissible: true,
    actions:     [
      {
        label:   "فهمت، شكراً",
        variant: "primary",
        onPress: () => useAppSheetStore.getState().hide(),
      },
    ],
  });
}

export function showNetworkSheet(onRetry?: () => void) {
  useAppSheetStore.getState().show({
    type:        "network",
    title:       "لا يوجد اتصال بالإنترنت",
    message:     "تحقق من اتصالك بالإنترنت وأعد المحاولة.",
    dismissible: true,
    actions:     onRetry
      ? [
          {
            label:   "إعادة المحاولة",
            variant: "primary",
            onPress: () => { useAppSheetStore.getState().hide(); onRetry(); },
          },
        ]
      : [
          {
            label:   "حسناً",
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
        label:   opts?.confirmLabel ?? i18n.t("sheet.confirm"),
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
