/**
 * useQueuedRedeemGift unit tests.
 *
 * Mirrors useQueuedRedeemCoupon tests — same branching logic, different
 * RPC target and payload shape (includes address).
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../useRedeemGift", () => ({
  useRedeemGift: jest.fn(),
}));

jest.mock("@/lib/offlineQueueRunner", () => ({
  enqueueOp: jest.fn(),
}));

jest.mock("../../offlineHandlers", () => ({
  LOYALTY_OP_KINDS: { REDEEM_COUPON: "loyalty:redeem_coupon", REDEEM_GIFT: "loyalty:redeem_gift" },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { renderHook, act } from "@testing-library/react-native";
import { onlineManager } from "@tanstack/react-query";
import { useQueuedRedeemGift } from "../useQueuedRedeemGift";
import type { RedemptionAddress } from "../../types";

const { useRedeemGift: mockUseRedeemGift } =
  jest.requireMock("../useRedeemGift") as { useRedeemGift: jest.Mock };

const { enqueueOp: mockEnqueueOp } =
  jest.requireMock("@/lib/offlineQueueRunner") as { enqueueOp: jest.Mock };

// ─── Per-test setup ───────────────────────────────────────────────────────────

const SAMPLE_ADDRESS: RedemptionAddress = {
  name:        "Test User",
  phone:       "01012345678",
  governorate: "القاهرة",
  city:        "Cairo",
  district:    "Nasr City",
  street:      "Abbas El-Akkad",
  building:    "1",
  floor:       "2",
  apartment:   "3",
  notes:       "",
};

const INPUT = { giftId: "gift-uuid-abc", address: SAMPLE_ADDRESS };

let mockRedeemFn: jest.Mock;
let mockResetFn:  jest.Mock;
let isOnlineSpy:  jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();

  mockRedeemFn = jest.fn();
  mockResetFn  = jest.fn();
  mockUseRedeemGift.mockReturnValue({
    redeem:    mockRedeemFn,
    isPending: false,
    isSuccess: false,
    isError:   false,
    error:     null,
    data:      undefined,
    reset:     mockResetFn,
  });

  isOnlineSpy = jest.spyOn(onlineManager, "isOnline").mockReturnValue(true);
  mockEnqueueOp.mockReturnValue({ id: "op-gift-001" });
});

afterEach(() => {
  isOnlineSpy.mockRestore();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useQueuedRedeemGift — online path", () => {
  it("calls online.redeem() with the full input including address", () => {
    const { result } = renderHook(() => useQueuedRedeemGift());
    act(() => { result.current.redeem(INPUT); });
    expect(mockRedeemFn).toHaveBeenCalledWith(INPUT);
  });

  it("returns { mode: 'online', pending: true }", () => {
    const { result } = renderHook(() => useQueuedRedeemGift());
    let rv: ReturnType<typeof result.current.redeem>;
    act(() => { rv = result.current.redeem(INPUT); });
    expect(rv!).toEqual({ mode: "online", pending: true });
  });

  it("does NOT call enqueueOp when online", () => {
    const { result } = renderHook(() => useQueuedRedeemGift());
    act(() => { result.current.redeem(INPUT); });
    expect(mockEnqueueOp).not.toHaveBeenCalled();
  });
});

describe("useQueuedRedeemGift — offline path", () => {
  beforeEach(() => {
    isOnlineSpy.mockReturnValue(false);
  });

  it("calls enqueueOp with kind REDEEM_GIFT and giftId + address payload", () => {
    const { result } = renderHook(() => useQueuedRedeemGift());
    act(() => { result.current.redeem(INPUT); });
    expect(mockEnqueueOp).toHaveBeenCalledWith(
      expect.objectContaining({
        kind:    "loyalty:redeem_gift",
        payload: expect.objectContaining({
          giftId:  INPUT.giftId,
          address: SAMPLE_ADDRESS,
        }),
      }),
    );
  });

  it("returns { mode: 'queued', opId } from enqueueOp", () => {
    mockEnqueueOp.mockReturnValue({ id: "queued-gift-777" });
    const { result } = renderHook(() => useQueuedRedeemGift());
    let rv: ReturnType<typeof result.current.redeem>;
    act(() => { rv = result.current.redeem(INPUT); });
    expect(rv!).toEqual({ mode: "queued", opId: "queued-gift-777" });
  });

  it("does NOT call online.redeem() when offline", () => {
    const { result } = renderHook(() => useQueuedRedeemGift());
    act(() => { result.current.redeem(INPUT); });
    expect(mockRedeemFn).not.toHaveBeenCalled();
  });

  it("envelope idempotencyKey matches payload idempotencyKey", () => {
    const { result } = renderHook(() => useQueuedRedeemGift());
    act(() => { result.current.redeem(INPUT); });
    const op = mockEnqueueOp.mock.calls[0][0] as {
      idempotencyKey: string;
      payload: { idempotencyKey: string };
    };
    expect(op.idempotencyKey).toHaveLength(32);
    expect(op.payload.idempotencyKey).toBe(op.idempotencyKey);
  });
});
