/**
 * Loyalty & Rewards — public barrel.
 *
 * UI components are intentionally NOT exported. The backend was specified
 * as the only deliverable for slice 3; a future slice will add the
 * loyalty screens once these primitives are battle-tested.
 */

// Types + zod schemas
export type {
  LoyaltyBalance,
  LedgerEntry,
  RewardTier,
  RewardCampaign,
  ReferralCode,
  ReferralReward,
  CouponBatch,
  Coupon,
  CouponDiscountKind,
  CouponValidation,
  GiftCatalogItem,
  GiftInventory,
  GiftRedemption,
  GiftRedemptionState,
  EarnPointsResponse,
  RedeemCouponResponse,
  RedeemGiftResponse,
  ReleaseGiftResponse,
  ApplyCouponResponse,
  RedemptionAddress,
} from "./types";

// API
export {
  getLoyaltyBalance,
  listCouponBatches,
  listUserCoupons,
  listGiftCatalog,
  listRedemptions,
  listActiveCampaigns,
  listTiers,
  getLoyaltyLedgerPage,
  redeemCoupon,
  redeemGift,
  releaseGift,
  validateCoupon,
  applyCouponCheckout,
  getReferralCode,
  listReferralRewards,
} from "./api/loyaltyApi";

export { loyaltyKeys } from "./api/queryKeys";
export { newIdempotencyKey } from "./api/idempotency";

// Read hooks
export { useLoyaltyBalance }      from "./hooks/useLoyaltyBalance";
export { useLoyaltyHistory }      from "./hooks/useLoyaltyHistory";
export { useCouponBatches }       from "./hooks/useCouponBatches";
export { useGiftCatalog }         from "./hooks/useGiftCatalog";
export { useUserCoupons }         from "./hooks/useUserCoupons";
export { useRedemptions }         from "./hooks/useRedemptions";
export { useActiveCampaigns }     from "./hooks/useActiveCampaigns";
export { useRewardTiers }         from "./hooks/useRewardTiers";
export { useReferralCode, useReferralRewards } from "./hooks/useReferralCode";

// Mutation hooks
export { useRedeemCoupon }            from "./hooks/useRedeemCoupon";
export { useRedeemGift }              from "./hooks/useRedeemGift";
export { useQueuedRedeemCoupon }      from "./hooks/useQueuedRedeemCoupon";
export { useQueuedRedeemGift }        from "./hooks/useQueuedRedeemGift";
export { useApplyCouponAtCheckout }   from "./hooks/useApplyCouponAtCheckout";
export { useCancelGiftRedemption }    from "./hooks/useCancelGiftRedemption";
export { useValidateCoupon }          from "./hooks/useValidateCoupon";

// Screens
export { LoyaltyHubScreen }           from "./screens/LoyaltyHubScreen";
export { LoyaltyWalletScreen }        from "./screens/LoyaltyWalletScreen";
export { CouponsScreen }              from "./screens/CouponsScreen";
export { GiftCatalogScreen }          from "./screens/GiftCatalogScreen";
export { LedgerHistoryScreen }        from "./screens/LedgerHistoryScreen";
export { TiersScreen }                from "./screens/TiersScreen";
export { CampaignsScreen }            from "./screens/CampaignsScreen";
export { RedemptionHistoryScreen }    from "./screens/RedemptionHistoryScreen";

// Components
export { GiftAddressSheet }           from "./components/GiftAddressSheet";
export { SubScreenHeader }            from "./components/SubScreenHeader";
