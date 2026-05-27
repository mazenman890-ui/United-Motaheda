/**
 * useValidateCoupon — read-only RPC, debounced + cached by code.
 *
 * Designed for the checkout coupon input field. Pass the current cart
 * total + categories; the hook returns validation result or null while
 * the user is still typing.
 */

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { validateCoupon } from "../api/loyaltyApi";
import { loyaltyKeys } from "../api/queryKeys";

export interface UseValidateCouponArgs {
  code:            string;
  cartTotalCents:  number;
  categories?:     string[];
  enabled?:        boolean;
}

export function useValidateCoupon({
  code,
  cartTotalCents,
  categories,
  enabled = true,
}: UseValidateCouponArgs) {
  const debouncedCode = useDebounce(code.trim().toUpperCase(), 250);

  return useQuery({
    queryKey: loyaltyKeys.validateCoupon(debouncedCode),
    queryFn:  () => validateCoupon({ code: debouncedCode, cartTotalCents, categories }),
    enabled:  enabled && debouncedCode.length >= 4,
    staleTime: 30 * 1000,
  });
}
