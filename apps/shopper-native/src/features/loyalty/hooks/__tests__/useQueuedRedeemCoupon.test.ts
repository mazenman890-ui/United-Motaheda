/**
 * useQueuedRedeemCoupon unit tests.
 *
 * The hook branches on onlineManager.isOnline():
 *   Online  → calls useRedeemCoupon().redeem() and returns { mode: "online" }
 *   Offline → calls enqueueOp() and returns { mode: "queued", opId }
 *
 * Uses jest.spyOn for onlineManager (avoids hoisting pitfall with variables
 * in jest.mock() factories) and jest.requireMock for local module mocks.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../useRedeemCoupon", () => ({
  useRedeemCoupon: jest.fn(),
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
import { useQueuedRedeemCoupon } from "../useQueuedRedeemCoupon";
import type { UseRedeemCouponInput } from "../useRedeemCoupon";

// Access mock functions via requireMock (safe after jest.mock() declarations above)
const { useRedeemCoupon: mockUseRedeemCoupon } =
  jest.requireMock("../useRedeemCoupon") as { useRedeemCoupon: jest.Mock };

const { enqueueOp: mockEnqueueOp } =
  jest.requireMock("@/lib/offlineQueueRunner") as { enqueueOp: jest.Mock };

// ─── Per-test setup ───────────────────────────────────────────────────────────

const INPUT: UseRedeemCouponInput = { batchId: "batch-uuid-123" };

let mockRedeemFn: jest.Mock;
let mockResetFn:  jest.Mock;
let isOnlineSpy:  jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();

  mockRedeemFn = jest.fn();
  mockResetFn  = jest.fn();
  mockUseRedeemCoupon.mockReturnValue({
    redeem:    mockRedeemFn,
    isPending: false,
    isSuccess: false,
    isError:   false,
    error:     null,
    data:      undefined,
    reset:     mockResetFn,
  });

  isOnlineSpy = jest.spyOn(onlineManager, "isOnline").mockReturnValue(true);
  mockEnqueueOp.mockReturnValue({ id: "op-abc-123" });
});

afterEach(() => {
  isOnlineSpy.mockRestore();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useQueuedRedeemCoupon — online path", () => {
  it("calls online.redeem() with the supplied input", () => {
    const { result } = renderHook(() => useQueuedRedeemCoupon());
    act(() => { result.current.redeem(INPUT); });
    expect(mockRedeemFn).toHaveBeenCalledWith(INPUT);
  });

  it("returns { mode: 'online', pending: true }", () => {
    const { result } = renderHook(() => useQueuedRedeemCoupon());
    let rv: ReturnType<typeof result.current.redeem>;
    act(() => { rv = result.current.redeem(INPUT); });
    expect(rv!).toEqual({ mode: "online", pending: true });
  });

  it("does NOT call enqueueOp when online", () => {
    const { result } = renderHook(() => useQueuedRedeemCoupon());
    act(() => { result.current.redeem(INPUT); });
    expect(mockEnqueueOp).not.toHaveBeenCalled();
  });
});

describe("useQueuedRedeemCoupon — offline path", () => {
  beforeEach(() => {
    isOnlineSpy.mockReturnValue(false);
  });

  it("calls enqueueOp with the correct kind and payload", () => {
    const { result } = renderHook(() => useQueuedRedeemCoupon());
    act(() => { result.current.redeem(INPUT); });
    expect(mockEnqueueOp).toHaveBeenCalledWith(
      expect.objectContaining({
        kind:    "loyalty:redeem_coupon",
        payload: expect.objectContaining({ batchId: INPUT.batchId }),
      }),
    );
  });

  it("returns { mode: 'queued', opId } with the op id from enqueueOp", () => {
    mockEnqueueOp.mockReturnValue({ id: "offline-op-999" });
    const { result } = renderHook(() => useQueuedRedeemCoupon());
    let rv: ReturnType<typeof result.current.redeem>;
    act(() => { rv = result.current.redeem(INPUT); });
    expect(rv!).toEqual({ mode: "queued", opId: "offline-op-999" });
  });

  it("does NOT call online.redeem() when offline", () => {
    const { result } = renderHook(() => useQueuedRedeemCoupon());
    act(() => { result.current.redeem(INPUT); });
    expect(mockRedeemFn).not.toHaveBeenCalled();
  });

  it("includes a stable idempotency key in both payload and op envelope", () => {
    const { result } = renderHook(() => useQueuedRedeemCoupon());
    act(() => { result.current.redeem(INPUT); });

    const call = mockEnqueueOp.mock.calls[0][0] as {
      payload: { idempotencyKey: string };
      idempotencyKey: string;
    };
    expect(call.payload.idempotencyKey).toBe(call.idempotencyKey);
    expect(call.idempotencyKey).toHaveLength(32);
  });
});

describe("useQueuedRedeemCoupon — hook surface", () => {
  it("proxies isPending / isSuccess / isError / error / data / reset from online hook", () => {
    const { result } = renderHook(() => useQueuedRedeemCoupon());
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeUndefined();
    act(() => { result.current.reset(); });
    expect(mockResetFn).toHaveBeenCalled();
  });
});
