import type { CheckoutPaymentMethod } from "./types";

export function isManualWalletPayment(
  method: CheckoutPaymentMethod,
): method is "vodafone" | "instapay" {
  return method === "vodafone" || method === "instapay";
}
