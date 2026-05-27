/**
 * Loyalty API — typed RPC wrappers.
 *
 * Every mutation goes through withTimeout(), throws a typed error on
 * non-2xx, and validates the response shape with zod. No `select('*')`,
 * no raw row passthrough — callers consume strongly-typed DTOs only.
 */

import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/supabaseRequest";
import { captureError } from "@/lib/crashReporter";
import {
  ApplyCouponResponseSchema,
  CouponBatchSchema,
  CouponSchema,
  CouponValidationSchema,
  GiftCatalogItemSchema,
  GiftInventorySchema,
  GiftRedemptionSchema,
  LedgerEntrySchema,
  LoyaltyBalanceSchema,
  RedeemCouponResponseSchema,
  RedeemGiftResponseSchema,
  ReleaseGiftResponseSchema,
  ReferralCodeSchema,
  ReferralRewardSchema,
  RewardCampaignSchema,
  RewardTierSchema,
  type ApplyCouponResponse,
  type CouponBatch,
  type Coupon,
  type CouponValidation,
  type GiftCatalogItem,
  type GiftInventory,
  type GiftRedemption,
  type LedgerEntry,
  type LoyaltyBalance,
  type RedeemCouponResponse,
  type RedeemGiftResponse,
  type RedemptionAddress,
  type ReleaseGiftResponse,
  type ReferralCode,
  type ReferralReward,
  type RewardCampaign,
  type RewardTier,
} from "../types";

// ─── Read endpoints ─────────────────────────────────────────────────────────

export async function getLoyaltyBalance(signal?: AbortSignal): Promise<LoyaltyBalance> {
  const data = await withTimeout(
    (timeoutSignal) =>
      supabase.rpc("get_loyalty_balance").abortSignal(linkSignals(signal, timeoutSignal)),
    { signal },
  );
  return LoyaltyBalanceSchema.parse(data);
}

export async function listCouponBatches(signal?: AbortSignal): Promise<CouponBatch[]> {
  const data = await withTimeout(
    (timeoutSignal) =>
      supabase
        .from("coupon_batches")
        .select(
          "id,name,description,discount_kind,discount_value,min_spend_cents,max_discount_cents,category_restrictions,points_cost,total_supply,issued_count,redeemed_count,expires_at,is_active",
        )
        .eq("is_active", true)
        .order("points_cost", { ascending: true })
        .abortSignal(linkSignals(signal, timeoutSignal)),
    { signal },
  );
  return CouponBatchSchema.array().parse(data);
}

export async function listUserCoupons(signal?: AbortSignal): Promise<Coupon[]> {
  const data = await withTimeout(
    (timeoutSignal) =>
      supabase
        .from("coupons")
        .select("id,batch_id,user_id,code,state,issued_at,consumed_at,consumed_order_id,expires_at")
        .order("issued_at", { ascending: false })
        .abortSignal(linkSignals(signal, timeoutSignal)),
    { signal },
  );
  return CouponSchema.array().parse(data);
}

export async function listGiftCatalog(signal?: AbortSignal): Promise<Array<GiftCatalogItem & { inventory?: GiftInventory }>> {
  const [catalogRaw, inventoryRaw] = await Promise.all([
    withTimeout(
      (timeoutSignal) =>
        supabase
          .from("gift_catalog")
          .select("id,name,description,image_url,points_cost,is_active,category")
          .eq("is_active", true)
          .order("points_cost", { ascending: true })
          .abortSignal(linkSignals(signal, timeoutSignal)),
      { signal },
    ),
    withTimeout(
      (timeoutSignal) =>
        supabase
          .from("gift_inventory")
          .select("gift_id,total_stock,reserved,fulfilled")
          .abortSignal(linkSignals(signal, timeoutSignal)),
      { signal },
    ),
  ]);

  const catalog   = GiftCatalogItemSchema.array().parse(catalogRaw);
  const inventory = GiftInventorySchema.array().parse(inventoryRaw);
  const invByGift = new Map(inventory.map((i) => [i.gift_id, i] as const));
  return catalog.map((g) => ({ ...g, inventory: invByGift.get(g.id) }));
}

export async function listRedemptions(signal?: AbortSignal): Promise<GiftRedemption[]> {
  const data = await withTimeout(
    (timeoutSignal) =>
      supabase
        .from("gift_redemptions")
        .select("id,user_id,gift_id,points_spent,ledger_id,state,reserved_at,fulfilled_at,cancelled_at,cancellation_reason,expires_at,tracking_number")
        .order("reserved_at", { ascending: false })
        .abortSignal(linkSignals(signal, timeoutSignal)),
    { signal },
  );
  return GiftRedemptionSchema.array().parse(data);
}

export async function listActiveCampaigns(signal?: AbortSignal): Promise<RewardCampaign[]> {
  const data = await withTimeout(
    (timeoutSignal) =>
      supabase
        .from("reward_campaigns")
        .select("id,name,description,starts_at,ends_at,is_active,multiplier,min_purchase_cents,max_redemptions_per_user,total_budget,points_issued,category_restrictions")
        .eq("is_active", true)
        .order("ends_at", { ascending: true, nullsFirst: false })
        .abortSignal(linkSignals(signal, timeoutSignal)),
    { signal },
  );
  return RewardCampaignSchema.array().parse(data);
}

export async function listTiers(signal?: AbortSignal): Promise<RewardTier[]> {
  const data = await withTimeout(
    (timeoutSignal) =>
      supabase
        .from("reward_tiers")
        .select("id,name,min_lifetime_points,earn_multiplier,display_order")
        .order("display_order", { ascending: true })
        .abortSignal(linkSignals(signal, timeoutSignal)),
    { signal },
  );
  return RewardTierSchema.array().parse(data);
}

export type LedgerKind = LedgerEntry["kind"];

export interface GetLedgerPageArgs {
  limit?:  number;
  offset?: number;
  kind?:   LedgerKind;
  source?: string;
  signal?: AbortSignal;
}

/** Generic ledger pagination with optional filtering. */
export async function getLoyaltyLedgerPage({
  limit  = 20,
  offset = 0,
  kind,
  source,
  signal,
}: GetLedgerPageArgs): Promise<LedgerEntry[]> {
  const data = await withTimeout(
    (timeoutSignal) => {
      let q = supabase
        .from("loyalty_ledger")
        .select("id,user_id,delta,balance_after,kind,source,source_ref,parent_ledger_id,metadata,created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)
        .abortSignal(linkSignals(signal, timeoutSignal));
      if (kind) q = q.eq("kind", kind);
      if (source) q = q.eq("source", source);
      return q;
    },
    { signal },
  );
  return LedgerEntrySchema.array().parse(data);
}

export async function getLoyaltyHistory(
  limit  = 20,
  offset = 0,
  signal?: AbortSignal,
): Promise<LedgerEntry[]> {
  return getLoyaltyLedgerPage({ limit, offset, signal });
}

export async function getReferralCode(signal?: AbortSignal): Promise<ReferralCode | null> {
  const data = await withTimeout(
    (timeoutSignal) =>
      supabase
        .from("referral_codes")
        .select("user_id,code,created_at")
        .abortSignal(linkSignals(signal, timeoutSignal))
        .maybeSingle(),
    { signal },
  );
  if (!data) return null;
  return ReferralCodeSchema.parse(data);
}

export async function listReferralRewards(
  limit  = 20,
  offset = 0,
  signal?: AbortSignal,
): Promise<ReferralReward[]> {
  const data = await withTimeout(
    (timeoutSignal) =>
      supabase
        .from("referral_rewards")
        .select("id,referrer_id,referee_id,referee_first_order_id,points_granted,ledger_id,created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)
        .abortSignal(linkSignals(signal, timeoutSignal)),
    { signal },
  );
  return ReferralRewardSchema.array().parse(data);
}

// ─── Mutation endpoints ─────────────────────────────────────────────────────

export interface RedeemCouponArgs {
  batchId:        string;
  idempotencyKey: string;
}
export async function redeemCoupon({ batchId, idempotencyKey }: RedeemCouponArgs): Promise<RedeemCouponResponse> {
  return rpc("redeem_points_for_coupon", {
    p_batch_id:        batchId,
    p_idempotency_key: idempotencyKey,
  }, RedeemCouponResponseSchema, "redeemCoupon");
}

export interface RedeemGiftArgs {
  giftId:         string;
  address:        RedemptionAddress;
  idempotencyKey: string;
}
export async function redeemGift({ giftId, address, idempotencyKey }: RedeemGiftArgs): Promise<RedeemGiftResponse> {
  return rpc("redeem_points_for_gift", {
    p_gift_id:         giftId,
    p_address:         address,
    p_idempotency_key: idempotencyKey,
  }, RedeemGiftResponseSchema, "redeemGift");
}

export interface ReleaseGiftArgs {
  redemptionId:   string;
  reason:         string;
  idempotencyKey: string;
}
export async function releaseGift({ redemptionId, reason, idempotencyKey }: ReleaseGiftArgs): Promise<ReleaseGiftResponse> {
  return rpc("release_gift_inventory", {
    p_redemption_id:   redemptionId,
    p_reason:          reason,
    p_idempotency_key: idempotencyKey,
  }, ReleaseGiftResponseSchema, "releaseGift");
}

export interface ValidateCouponArgs {
  code:           string;
  cartTotalCents: number;
  categories?:    string[];
}
export async function validateCoupon({ code, cartTotalCents, categories }: ValidateCouponArgs): Promise<CouponValidation> {
  return rpc("validate_coupon", {
    p_code:               code,
    p_cart_total_cents:   cartTotalCents,
    p_categories:         categories ?? null,
  }, CouponValidationSchema, "validateCoupon");
}

export interface ApplyCouponArgs {
  code:           string;
  orderId:        string;
  idempotencyKey: string;
}
export async function applyCouponCheckout({ code, orderId, idempotencyKey }: ApplyCouponArgs): Promise<ApplyCouponResponse> {
  return rpc("apply_coupon_checkout", {
    p_code:             code,
    p_order_id:         orderId,
    p_idempotency_key:  idempotencyKey,
  }, ApplyCouponResponseSchema, "applyCouponCheckout");
}

// ─── Internal helpers ───────────────────────────────────────────────────────

interface RpcSchema<T> {
  parse(value: unknown): T;
}

async function rpc<T>(
  fn:     string,
  params: Record<string, unknown>,
  schema: RpcSchema<T>,
  label:  string,
): Promise<T> {
  try {
    const data = await withTimeout(
      (signal) => supabase.rpc(fn, params).abortSignal(signal),
      { timeoutMs: 15_000 },
    );
    return schema.parse(data);
  } catch (e) {
    captureError(e, { surface: "loyalty", rpc: fn, op: label });
    throw e;
  }
}

function linkSignals(external: AbortSignal | undefined, timeout: AbortSignal): AbortSignal {
  if (!external) return timeout;
  if (external.aborted) return external;
  if (timeout.aborted)  return timeout;

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  external.addEventListener("abort", onAbort, { once: true });
  timeout.addEventListener("abort",  onAbort, { once: true });
  return controller.signal;
}
