import { useInfiniteQuery } from "@tanstack/react-query";
import { getLoyaltyLedgerPage, type LedgerKind } from "../api/loyaltyApi";
import { loyaltyKeys } from "../api/queryKeys";
import type { LedgerEntry } from "../types";

const PAGE_SIZE = 20;

export interface LoyaltyHistoryPage {
  entries:    LedgerEntry[];
  nextOffset: number | null;
}

export interface UseLoyaltyHistoryOptions {
  kind?:    LedgerKind;
  source?:  string;
  enabled?: boolean;
}

export function useLoyaltyHistory(opts: UseLoyaltyHistoryOptions = {}) {
  const { kind, source, enabled = true } = opts;
  return useInfiniteQuery<LoyaltyHistoryPage, Error>({
    queryKey:         loyaltyKeys.history({ kind, source }),
    initialPageParam: 0,
    queryFn:          async ({ pageParam, signal }) => {
      const offset  = pageParam as number;
      const entries = await getLoyaltyLedgerPage({
        limit: PAGE_SIZE,
        offset,
        kind,
        source,
        signal,
      });
      return {
        entries,
        nextOffset: entries.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
      };
    },
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled,
    staleTime: 60 * 1000,
  });
}
