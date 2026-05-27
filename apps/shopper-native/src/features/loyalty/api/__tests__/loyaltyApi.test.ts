/**
 * loyaltyApi unit tests.
 *
 * Strategy:
 *   - Mock @/lib/supabaseRequest so withTimeout simply calls the builder
 *     factory and resolves/rejects without real networking or timers.
 *   - Mock @/lib/supabase with jest.fn() stubs configured per-test via
 *     jest.mocked() — avoids the hoisting pitfall of referencing outer
 *     variables inside jest.mock() factory functions.
 *   - Mock @/lib/crashReporter so captureError is observable.
 */

// ─── Mock declarations (hoisted by Jest) ────────────────────────────────────

jest.mock("@/lib/crashReporter", () => ({
  captureError: jest.fn(),
}));

jest.mock("@/lib/supabaseRequest", () => ({
  withTimeout: jest.fn(async (build: (s: AbortSignal) => unknown) => {
    const result = await (build(new AbortController().signal) as Promise<{ data: unknown; error: unknown }>);
    if (result === null || result === undefined) return null;
    if ((result as any).error) throw (result as any).error;
    return (result as any).data;
  }),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc:  jest.fn(),
    from: jest.fn(),
  },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import {
  getLoyaltyBalance,
  getLoyaltyLedgerPage,
  getReferralCode,
  listTiers,
  redeemCoupon,
} from "../loyaltyApi";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/supabaseRequest";

const mockedRpc  = jest.mocked(supabase.rpc);
const mockedFrom = jest.mocked(supabase.from);
const mockedWithTimeout = jest.mocked(withTimeout);

// ─── Builder factory ─────────────────────────────────────────────────────────

/**
 * Returns a Supabase-builder-shaped object: all chain methods return `self`,
 * and the object is thenable (awaitable as `{ data, error }`).
 */
function makeBuilder(data: unknown, error: unknown = null) {
  const self: Record<string, unknown> = {};
  for (const m of [
    "select","eq","neq","gt","lt","gte","lte",
    "order","range","limit","abortSignal","maybeSingle","single",
  ]) {
    self[m] = jest.fn(() => self);
  }
  self.then = (
    onFulfilled: ((v: unknown) => unknown) | null | undefined,
    onRejected?: ((e: unknown) => unknown) | null,
  ) => Promise.resolve({ data, error }).then(onFulfilled as any, onRejected as any);
  return self;
}

const VALID_UUID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getLoyaltyBalance ───────────────────────────────────────────────────────

describe("getLoyaltyBalance", () => {
  const balanceData = {
    balance:           500,
    lifetime_earned:   1000,
    lifetime_redeemed: 500,
    tier_id:           VALID_UUID,
    frozen:            false,
  };

  it("returns a parsed LoyaltyBalance on success", async () => {
    mockedRpc.mockReturnValue(makeBuilder(balanceData) as any);
    const result = await getLoyaltyBalance();
    expect(result.balance).toBe(500);
    expect(result.lifetime_earned).toBe(1000);
    expect(result.frozen).toBe(false);
  });

  it("coerces numeric strings from the server", async () => {
    mockedRpc.mockReturnValue(
      makeBuilder({ ...balanceData, balance: "750", lifetime_earned: "1500" }) as any,
    );
    const result = await getLoyaltyBalance();
    expect(result.balance).toBe(750);
    expect(result.lifetime_earned).toBe(1500);
  });

  it("throws when withTimeout rejects (e.g. network error)", async () => {
    mockedWithTimeout.mockRejectedValueOnce(new Error("network error"));
    await expect(getLoyaltyBalance()).rejects.toThrow("network error");
  });

  it("throws a Zod validation error when the schema doesn't match", async () => {
    mockedRpc.mockReturnValue(makeBuilder({ invalid: "shape" }) as any);
    await expect(getLoyaltyBalance()).rejects.toThrow();
  });
});

// ── getLoyaltyLedgerPage ────────────────────────────────────────────────────

describe("getLoyaltyLedgerPage", () => {
  const entry = {
    id:               VALID_UUID,
    user_id:          VALID_UUID,
    delta:            100,
    balance_after:    600,
    kind:             "earn",
    source:           "order",
    source_ref:       "order-123",
    parent_ledger_id: null,
    created_at:       "2026-01-01T00:00:00Z",
  };

  it("returns an array of LedgerEntry on success", async () => {
    mockedFrom.mockReturnValue(makeBuilder([entry]) as any);
    const results = await getLoyaltyLedgerPage({ limit: 20, offset: 0 });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("earn");
    expect(results[0].delta).toBe(100);
  });

  it("returns an empty array when there are no entries", async () => {
    mockedFrom.mockReturnValue(makeBuilder([]) as any);
    const results = await getLoyaltyLedgerPage({ limit: 20, offset: 0 });
    expect(results).toEqual([]);
  });

  it("calls .eq('kind', ...) when a kind filter is supplied", async () => {
    const builder = makeBuilder([entry]);
    const eqSpy = jest.fn(() => builder);
    builder.eq = eqSpy;
    mockedFrom.mockReturnValue(builder as any);

    await getLoyaltyLedgerPage({ limit: 20, offset: 0, kind: "earn" });
    expect(eqSpy).toHaveBeenCalledWith("kind", "earn");
  });

  it("does NOT call .eq('kind', ...) when no filter is supplied", async () => {
    const builder = makeBuilder([entry]);
    const eqSpy = jest.fn(() => builder);
    builder.eq = eqSpy;
    mockedFrom.mockReturnValue(builder as any);

    await getLoyaltyLedgerPage({ limit: 20, offset: 0 });
    const kindCalls = (eqSpy.mock.calls as unknown as [string, unknown][]).filter(([col]) => col === "kind");
    expect(kindCalls).toHaveLength(0);
  });
});

// ── getReferralCode ─────────────────────────────────────────────────────────

describe("getReferralCode", () => {
  it("returns null when the row is not found (withTimeout returns null)", async () => {
    // When maybeSingle finds no row, withTimeout returns null.
    mockedWithTimeout.mockResolvedValueOnce(null as any);
    const result = await getReferralCode();
    expect(result).toBeNull();
  });

  it("returns a parsed ReferralCode when the row exists", async () => {
    mockedWithTimeout.mockResolvedValueOnce({
      user_id:    VALID_UUID,
      code:       "REF-ABC123",
      created_at: "2026-01-01T00:00:00Z",
    } as any);
    const result = await getReferralCode();
    expect(result).not.toBeNull();
    expect(result!.code).toBe("REF-ABC123");
  });
});

// ── listTiers ───────────────────────────────────────────────────────────────

describe("listTiers", () => {
  const tier = {
    id:                  VALID_UUID,
    name:                "Gold",
    min_lifetime_points: 1000,
    earn_multiplier:     1.5,
    display_order:       1,
  };

  it("returns parsed tiers sorted by display_order (server-side)", async () => {
    mockedFrom.mockReturnValue(makeBuilder([tier]) as any);
    const results = await listTiers();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Gold");
    expect(results[0].earn_multiplier).toBe(1.5);
  });
});

// ── redeemCoupon (mutation via rpc helper) ──────────────────────────────────

describe("redeemCoupon", () => {
  // Shape matches RedeemCouponResponseSchema exactly.
  const successResponse = {
    coupon_id:  VALID_UUID,
    code:       "SAVE10",
    balance:    400,
    expires_at: "2026-12-31T00:00:00Z",
    ledger_id:  VALID_UUID,
  };

  it("calls the correct RPC function with expected params", async () => {
    mockedRpc.mockReturnValue(makeBuilder(successResponse) as any);
    await redeemCoupon({ batchId: VALID_UUID, idempotencyKey: "abc".padEnd(32, "0") });
    expect(mockedRpc).toHaveBeenCalledWith(
      "redeem_points_for_coupon",
      expect.objectContaining({
        p_batch_id:        VALID_UUID,
        p_idempotency_key: "abc".padEnd(32, "0"),
      }),
    );
  });

  it("returns a parsed RedeemCouponResponse on success", async () => {
    mockedRpc.mockReturnValue(makeBuilder(successResponse) as any);
    const result = await redeemCoupon({ batchId: VALID_UUID, idempotencyKey: "abc".padEnd(32, "0") });
    expect(result.code).toBe("SAVE10");
    expect(result.balance).toBe(400);
  });

  it("captures and rethrows errors via captureError", async () => {
    const { captureError } = require("@/lib/crashReporter");
    mockedWithTimeout.mockRejectedValueOnce(new Error("RPC failed"));

    await expect(
      redeemCoupon({ batchId: VALID_UUID, idempotencyKey: "abc".padEnd(32, "0") }),
    ).rejects.toThrow("RPC failed");

    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ surface: "loyalty", rpc: "redeem_points_for_coupon" }),
    );
  });
});
