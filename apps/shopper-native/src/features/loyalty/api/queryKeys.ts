/**
 * Loyalty query keys. First segment matches the SENSITIVE_PREFIXES list in
 * queryPersister so balances / coupons / redemptions are NEVER persisted to
 * disk — they live in memory only.
 */

export const loyaltyKeys = {
  all:           ["loyalty"] as const,
  balance:       () => ["loyalty", "balance"] as const,
  /** Infinite-scroll ledger history. Key includes filter opts so different
   *  filter combinations live in separate cache slots. */
  history:       (opts: { kind?: string; source?: string } = {}) =>
    ["loyalty", "history", { kind: opts.kind ?? null, source: opts.source ?? null }] as const,
  couponBatches: () => ["loyalty", "coupon-batches"] as const,
  userCoupons:   () => ["loyalty", "coupons"] as const,
  validateCoupon: (code: string) =>
    ["loyalty", "coupon-validate", code.trim().toUpperCase()] as const,
  giftCatalog:   () => ["loyalty", "gift-catalog"] as const,
  redemptions:   () => ["loyalty", "redemptions"] as const,
  campaigns:     () => ["loyalty", "campaigns"] as const,
  tiers:         () => ["loyalty", "tiers"] as const,
};
