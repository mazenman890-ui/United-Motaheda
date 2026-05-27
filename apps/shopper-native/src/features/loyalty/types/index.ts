/**
 * Loyalty & Rewards — typed DTOs mirroring the RPC contracts.
 *
 * Every type here is the wire format of a `public.*` Postgres function or
 * table. Zod schemas validate the runtime response shape so a backend
 * change that drops a field surfaces as a typed error in dev, not a
 * silent NaN in the UI.
 */

import { z } from "zod";

// ─── Primitives ─────────────────────────────────────────────────────────────

export const Uuid = z.string().uuid();

// ─── Account / ledger ───────────────────────────────────────────────────────

export const LoyaltyBalanceSchema = z.object({
  balance:           z.coerce.number().int().nonnegative(),
  lifetime_earned:   z.coerce.number().int().nonnegative(),
  lifetime_redeemed: z.coerce.number().int().nonnegative(),
  tier_id:           Uuid.nullable(),
  frozen:            z.boolean(),
  version:           z.coerce.number().int().optional(),
});
export type LoyaltyBalance = z.infer<typeof LoyaltyBalanceSchema>;

export const LedgerEntrySchema = z.object({
  id:               Uuid,
  user_id:          Uuid,
  delta:            z.coerce.number().int(),
  balance_after:    z.coerce.number().int().nonnegative(),
  kind:             z.enum(["earn","redeem","adjust","reverse","expire","bonus","referral","cashback"]),
  source:           z.string(),
  source_ref:       z.string().nullable(),
  parent_ledger_id: Uuid.nullable(),
  metadata:         z.record(z.string(), z.unknown()).optional(),
  created_at:       z.string(),
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

// ─── Tiers / campaigns ──────────────────────────────────────────────────────

export const RewardTierSchema = z.object({
  id:                  Uuid,
  name:                z.string(),
  min_lifetime_points: z.coerce.number().int().nonnegative(),
  earn_multiplier:     z.coerce.number().nonnegative(),
  display_order:       z.number().int(),
});
export type RewardTier = z.infer<typeof RewardTierSchema>;

export const RewardCampaignSchema = z.object({
  id:                       Uuid,
  name:                     z.string(),
  description:              z.string().nullable(),
  starts_at:                z.string().nullable(),
  ends_at:                  z.string().nullable(),
  is_active:                z.boolean(),
  multiplier:               z.coerce.number().nonnegative(),
  min_purchase_cents:       z.coerce.number().int().nullable(),
  max_redemptions_per_user: z.coerce.number().int().nullable(),
  total_budget:             z.coerce.number().int().nullable(),
  points_issued:            z.coerce.number().int().nonnegative(),
  category_restrictions:    z.array(z.string()).nullable(),
});
export type RewardCampaign = z.infer<typeof RewardCampaignSchema>;

// ─── Referral program ───────────────────────────────────────────────────────

export const ReferralCodeSchema = z.object({
  user_id:    Uuid,
  code:       z.string(),
  created_at: z.string(),
});
export type ReferralCode = z.infer<typeof ReferralCodeSchema>;

export const ReferralRewardSchema = z.object({
  id:                     Uuid,
  referrer_id:            Uuid,
  referee_id:             Uuid,
  referee_first_order_id: z.string().nullable(),
  points_granted:         z.coerce.number().int().positive(),
  ledger_id:              Uuid,
  created_at:             z.string(),
});
export type ReferralReward = z.infer<typeof ReferralRewardSchema>;

// ─── Coupons ────────────────────────────────────────────────────────────────

export const CouponDiscountKind = z.enum(["percent","flat","free_shipping"]);
export type CouponDiscountKind = z.infer<typeof CouponDiscountKind>;

export const CouponBatchSchema = z.object({
  id:                   Uuid,
  name:                 z.string(),
  description:          z.string().nullable(),
  discount_kind:        CouponDiscountKind,
  discount_value:       z.coerce.number().int().nonnegative(),
  min_spend_cents:      z.coerce.number().int().nullable(),
  max_discount_cents:   z.coerce.number().int().nullable(),
  category_restrictions: z.array(z.string()).nullable(),
  points_cost:          z.coerce.number().int().nonnegative(),
  total_supply:         z.coerce.number().int().nullable(),
  issued_count:         z.coerce.number().int().nonnegative(),
  redeemed_count:       z.coerce.number().int().nonnegative(),
  expires_at:           z.string().nullable(),
  is_active:            z.boolean(),
});
export type CouponBatch = z.infer<typeof CouponBatchSchema>;

export const CouponSchema = z.object({
  id:                 Uuid,
  batch_id:           Uuid,
  user_id:            Uuid.nullable(),
  code:               z.string(),
  state:              z.enum(["issued","consumed","expired","revoked"]),
  issued_at:          z.string(),
  consumed_at:        z.string().nullable(),
  consumed_order_id:  z.string().nullable(),
  expires_at:         z.string().nullable(),
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CouponValidationSchema = z.discriminatedUnion("valid", [
  z.object({
    valid:           z.literal(true),
    coupon_id:       Uuid,
    batch_id:        Uuid,
    discount_kind:   CouponDiscountKind,
    discount_value:  z.coerce.number().int().nonnegative(),
    discount_cents:  z.coerce.number().int().nonnegative(),
    free_shipping:   z.boolean(),
  }),
  z.object({
    valid:           z.literal(false),
    reason:          z.string(),
    min_spend_cents: z.coerce.number().int().optional(),
  }),
]);
export type CouponValidation = z.infer<typeof CouponValidationSchema>;

// ─── Gifts ──────────────────────────────────────────────────────────────────

export const GiftCatalogItemSchema = z.object({
  id:           Uuid,
  name:         z.string(),
  description:  z.string().nullable(),
  image_url:    z.string().nullable(),
  points_cost:  z.coerce.number().int().positive(),
  is_active:    z.boolean(),
  category:     z.string().nullable(),
});
export type GiftCatalogItem = z.infer<typeof GiftCatalogItemSchema>;

export const GiftInventorySchema = z.object({
  gift_id:     Uuid,
  total_stock: z.coerce.number().int().nonnegative(),
  reserved:    z.coerce.number().int().nonnegative(),
  fulfilled:   z.coerce.number().int().nonnegative(),
});
export type GiftInventory = z.infer<typeof GiftInventorySchema>;

export const GiftRedemptionStateSchema = z.enum(["reserved","fulfilled","cancelled","expired"]);
export type GiftRedemptionState = z.infer<typeof GiftRedemptionStateSchema>;

export const GiftRedemptionSchema = z.object({
  id:                  Uuid,
  user_id:             Uuid,
  gift_id:             Uuid,
  points_spent:        z.coerce.number().int().positive(),
  ledger_id:           Uuid,
  state:               GiftRedemptionStateSchema,
  reserved_at:         z.string(),
  fulfilled_at:        z.string().nullable(),
  cancelled_at:        z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  expires_at:          z.string(),
  tracking_number:     z.string().nullable(),
});
export type GiftRedemption = z.infer<typeof GiftRedemptionSchema>;

// ─── RPC return shapes ──────────────────────────────────────────────────────

export const EarnPointsResponseSchema = z.object({
  ledger_id: Uuid.nullable(),
  balance:   z.coerce.number().int().nonnegative(),
  amount:    z.coerce.number().int().nonnegative(),
  tier_id:   Uuid.nullable().optional(),
  kind:      z.string().optional(),
});
export type EarnPointsResponse = z.infer<typeof EarnPointsResponseSchema>;

export const RedeemCouponResponseSchema = z.object({
  coupon_id:  Uuid,
  code:       z.string(),
  balance:    z.coerce.number().int().nonnegative(),
  expires_at: z.string().nullable(),
  ledger_id:  Uuid,
});
export type RedeemCouponResponse = z.infer<typeof RedeemCouponResponseSchema>;

export const RedeemGiftResponseSchema = z.object({
  redemption_id: Uuid,
  ledger_id:     Uuid,
  balance:       z.coerce.number().int().nonnegative(),
  expires_at:    z.string(),
  state:         GiftRedemptionStateSchema,
});
export type RedeemGiftResponse = z.infer<typeof RedeemGiftResponseSchema>;

export const ReleaseGiftResponseSchema = z.object({
  redemption_id: Uuid,
  ledger_id:     Uuid,
  balance:       z.coerce.number().int().nonnegative(),
  refunded:      z.coerce.number().int().nonnegative(),
});
export type ReleaseGiftResponse = z.infer<typeof ReleaseGiftResponseSchema>;

export const ApplyCouponResponseSchema = z.object({
  coupon_id: Uuid,
  batch_id:  Uuid,
  order_id:  z.string(),
  state:     z.literal("consumed"),
});
export type ApplyCouponResponse = z.infer<typeof ApplyCouponResponseSchema>;

// ─── Address (passed to gift redemption) ────────────────────────────────────

export const RedemptionAddressSchema = z.object({
  /** Recipient name */
  name:        z.string().min(1),
  /** Mobile number (Egypt). Server stores as jsonb without extra validation. */
  phone:       z.string().min(1),
  /** Governorate (e.g., القاهرة) */
  governorate: z.string().optional(),
  /** City / district / area (e.g., مدينة نصر) */
  city:        z.string().min(1),
  /** Optional sub-area (for forward compatibility with saved addresses). */
  district:    z.string().optional(),
  street:      z.string().min(1),
  building:    z.string().optional(),
  floor:       z.string().optional(),
  apartment:   z.string().optional(),
  notes:       z.string().optional(),
});
export type RedemptionAddress = z.infer<typeof RedemptionAddressSchema>;
