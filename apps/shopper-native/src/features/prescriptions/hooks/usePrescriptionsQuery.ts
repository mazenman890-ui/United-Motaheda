/**
 * usePrescriptionsQuery — React Query hydrator.
 *
 * Fetches prescriptions + refill_requests from Supabase, maps row shapes,
 * and writes them into the Zustand store on success. Screens never call
 * this directly to read data — they read from Zustand via
 * `usePrescriptions`. This hook exists to keep the store in sync.
 *
 * Mount it once near the top of the authenticated tree (e.g., in the root
 * layout once a user is present) and React Query will handle re-fetches,
 * caching, and staleness.
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePrescriptionsStore } from "@/stores/prescriptionsStore";
import type { Prescription, RefillRequest } from "@/stores/prescriptionsStore";
import {
  rowToPrescription,
  rowToRefillRequest,
  type PrescriptionRow,
  type RefillRequestRow,
} from "../lib/rowMappers";

interface PrescriptionsBundle {
  prescriptions: Prescription[];
  refills:       RefillRequest[];
}

async function fetchPrescriptionsBundle(userId: string): Promise<PrescriptionsBundle> {
  const [rxRes, refillRes] = await Promise.all([
    supabase
      .from("prescriptions")
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false }),
    supabase
      .from("refill_requests")
      .select("*")
      .eq("user_id", userId)
      .order("placed_at", { ascending: false }),
  ]);

  if (rxRes.error)     throw rxRes.error;
  if (refillRes.error) throw refillRes.error;

  return {
    prescriptions: (rxRes.data     as PrescriptionRow[]   | null ?? []).map(rowToPrescription),
    refills:       (refillRes.data as RefillRequestRow[]  | null ?? []).map(rowToRefillRequest),
  };
}

export interface UsePrescriptionsQueryResult {
  isLoading:    boolean;
  isRefetching: boolean;
  isError:      boolean;
  error:        Error | null;
  refetch:      () => void;
}

export function usePrescriptionsQuery(userId: string | undefined): UsePrescriptionsQueryResult {
  const hydrate = usePrescriptionsStore((s) => s.hydrate);

  const query = useQuery({
    queryKey: ["prescriptions", userId],
    queryFn:  () => fetchPrescriptionsBundle(userId as string),
    enabled:  !!userId,
  });

  // Mirror RQ → Zustand whenever fresh data lands.
  useEffect(() => {
    if (query.data) {
      hydrate(query.data.prescriptions, query.data.refills);
    }
  }, [query.data, hydrate]);

  return {
    isLoading:    query.isLoading,
    isRefetching: query.isRefetching,
    isError:      query.isError,
    error:        query.error as Error | null,
    refetch:      query.refetch,
  };
}
