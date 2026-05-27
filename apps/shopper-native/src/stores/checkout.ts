import { create } from "zustand";
import type { CheckoutPaymentMethod } from "@/features/checkout";

interface CheckoutState {
  paymentMethod:  CheckoutPaymentMethod;
  transferNumber: string;
  receiptUri:     string | null;
}

interface CheckoutStore extends CheckoutState {
  setPaymentMethod:  (m: CheckoutPaymentMethod) => void;
  setTransferNumber: (v: string) => void;
  setReceiptUri:     (uri: string | null) => void;
  reset:             () => void;
}

const DEFAULT: CheckoutState = {
  paymentMethod:  "cod",
  transferNumber: "",
  receiptUri:     null,
};

export const useCheckoutStore = create<CheckoutStore>()((set) => ({
  ...DEFAULT,
  // Changing payment method clears the previous upload so stale receipts
  // never get attached to a different payment method.
  setPaymentMethod:  (m)   => set({ paymentMethod: m, transferNumber: "", receiptUri: null }),
  setTransferNumber: (v)   => set({ transferNumber: v }),
  setReceiptUri:     (uri) => set({ receiptUri: uri }),
  reset:             ()    => set(DEFAULT),
}));
