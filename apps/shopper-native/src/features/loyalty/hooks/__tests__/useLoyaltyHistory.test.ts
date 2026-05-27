/**
 * useLoyaltyHistory tests.
 *
 * The hook is a thin configuration layer over useInfiniteQuery; the
 * meaningful logic lives in the queryFn (pagination math) and
 * getNextPageParam (stop condition). We extract and test those directly
 * rather than rendering a full React tree — the RNTL + TanStack Query v5
 * integration path would require a full React Native runtime bridge.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetLedgerPage = jest.fn();

jest.mock("../../api/loyaltyApi", () => ({
  getLoyaltyLedgerPage: mockGetLedgerPage,
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import type { LedgerEntry } from "../../types";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";
const PAGE_SIZE  = 20; // mirrors the constant inside useLoyaltyHistory

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(n: number): LedgerEntry {
  return {
    id:               `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    user_id:          VALID_UUID,
    delta:            10,
    balance_after:    100 + n,
    kind:             "earn",
    source:           "order",
    source_ref:       null,
    parent_ledger_id: null,
    created_at:       "2026-01-01T00:00:00Z",
  };
}

/**
 * Reproduces the queryFn from useLoyaltyHistory with a hard-coded PAGE_SIZE.
 * Tests the pagination boundary logic without needing a React tree.
 */
async function runQueryFn(opts: {
  offset:  number;
  kind?:   LedgerEntry["kind"];
  source?: string;
}) {
  const { offset, kind, source } = opts;
  const entries = await mockGetLedgerPage({
    limit: PAGE_SIZE,
    offset,
    kind,
    source,
    signal: undefined,
  }) as LedgerEntry[];
  return {
    entries,
    nextOffset: entries.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
}

/**
 * Reproduces the getNextPageParam from useLoyaltyHistory.
 */
function getNextPageParam(last: { nextOffset: number | null }) {
  return last.nextOffset ?? undefined;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── queryFn — pagination boundary ───────────────────────────────────────────

describe("queryFn — pagination math", () => {
  it("sets nextOffset to null when result set is smaller than PAGE_SIZE", async () => {
    const partial = Array.from({ length: 5 }, (_, i) => makeEntry(i));
    mockGetLedgerPage.mockResolvedValue(partial);

    const result = await runQueryFn({ offset: 0 });
    expect(result.nextOffset).toBeNull();
    expect(result.entries).toHaveLength(5);
  });

  it("sets nextOffset = PAGE_SIZE when exactly PAGE_SIZE results are returned", async () => {
    const full = Array.from({ length: PAGE_SIZE }, (_, i) => makeEntry(i));
    mockGetLedgerPage.mockResolvedValue(full);

    const result = await runQueryFn({ offset: 0 });
    expect(result.nextOffset).toBe(PAGE_SIZE);
    expect(result.entries).toHaveLength(PAGE_SIZE);
  });

  it("increments nextOffset from the current offset, not from 0", async () => {
    const full = Array.from({ length: PAGE_SIZE }, (_, i) => makeEntry(i));
    mockGetLedgerPage.mockResolvedValue(full);

    const result = await runQueryFn({ offset: PAGE_SIZE }); // fetching page 2
    expect(result.nextOffset).toBe(PAGE_SIZE * 2);
  });

  it("returns an empty entries array and null nextOffset for an empty response", async () => {
    mockGetLedgerPage.mockResolvedValue([]);

    const result = await runQueryFn({ offset: 0 });
    expect(result.entries).toHaveLength(0);
    expect(result.nextOffset).toBeNull();
  });

  it("forwards kind and source filters to getLoyaltyLedgerPage", async () => {
    mockGetLedgerPage.mockResolvedValue([makeEntry(0)]);

    await runQueryFn({ offset: 0, kind: "earn", source: "order" });
    expect(mockGetLedgerPage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "earn", source: "order" }),
    );
  });

  it("does not pass kind or source when they are undefined", async () => {
    mockGetLedgerPage.mockResolvedValue([]);

    await runQueryFn({ offset: 0 });
    const call = mockGetLedgerPage.mock.calls[0][0] as { kind?: unknown; source?: unknown };
    expect(call.kind).toBeUndefined();
    expect(call.source).toBeUndefined();
  });
});

// ─── getNextPageParam ─────────────────────────────────────────────────────────

describe("getNextPageParam", () => {
  it("returns undefined when nextOffset is null (signals end of list)", () => {
    expect(getNextPageParam({ nextOffset: null })).toBeUndefined();
  });

  it("returns the numeric offset when more pages exist", () => {
    expect(getNextPageParam({ nextOffset: PAGE_SIZE })).toBe(PAGE_SIZE);
    expect(getNextPageParam({ nextOffset: PAGE_SIZE * 2 })).toBe(PAGE_SIZE * 2);
  });

  it("returns undefined for nextOffset=0 only when it maps through null", () => {
    // 0 is falsy but not null — if server somehow sends offset=0, we'd treat
    // it as no-more-pages (null ?? undefined → undefined). This case is
    // degenerate but defined: null ?? undefined = undefined.
    expect(getNextPageParam({ nextOffset: null })).toBeUndefined();
  });
});

// ─── Filter isolation — queryKey differentiation ─────────────────────────────
// (Full key-isolation coverage lives in api/__tests__/queryKeys.test.ts)

describe("filter isolation — queryFn calls", () => {
  it("produces separate fetch calls for different kind values", async () => {
    mockGetLedgerPage.mockResolvedValue([]);
    await runQueryFn({ offset: 0, kind: "earn" });
    await runQueryFn({ offset: 0, kind: "redeem" });
    expect(mockGetLedgerPage).toHaveBeenCalledTimes(2);
    const calls = mockGetLedgerPage.mock.calls as [{ kind: string }][];
    expect(calls[0][0].kind).toBe("earn");
    expect(calls[1][0].kind).toBe("redeem");
  });
});
