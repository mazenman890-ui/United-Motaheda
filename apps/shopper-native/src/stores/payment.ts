import { create } from "zustand";
import { storageGet, storageSet, STORAGE_KEYS } from "@/utils/storage";
import type { PaymentMethodType, PaymentState } from "@/types/payment";
import { PAYMENT_METHODS } from "@/types/payment";

const PAYMENT_STORAGE_KEY = "united-payment-v1";

export const usePaymentStore = create<PaymentState>((set) => ({
  selected: "cod",
  methods: PAYMENT_METHODS,
  loading: false,

  setSelected: (type) => {
    set({ selected: type });
    storageSet(PAYMENT_STORAGE_KEY, type);
  },
}));

export async function hydratePaymentStore() {
  const saved = await storageGet<PaymentMethodType>(PAYMENT_STORAGE_KEY);
  if (saved) usePaymentStore.setState({ selected: saved });
}
