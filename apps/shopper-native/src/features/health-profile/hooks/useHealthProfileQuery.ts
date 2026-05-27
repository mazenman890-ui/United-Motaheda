/**
 * useHealthProfileQuery — React Query hydrator for the health-profile slice.
 *
 * Fetches all four user-owned tables in parallel and mirrors them into
 * Zustand on success. Mirrors the prescriptions equivalent.
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useHealthProfileStore } from "@/stores/healthProfileStore";
import type {
  Allergy,
  Condition,
  Dependent,
  InsuranceCard,
} from "@/stores/healthProfileStore";
import {
  rowToAllergy,
  rowToCondition,
  rowToDependent,
  rowToInsuranceCard,
  type AllergyRow,
  type ConditionRow,
  type DependentRow,
  type InsuranceCardRow,
} from "../lib/rowMappers";

interface HealthProfileBundle {
  allergies:  Allergy[];
  conditions: Condition[];
  dependents: Dependent[];
  insurance:  InsuranceCard[];
}

async function fetchHealthProfile(userId: string): Promise<HealthProfileBundle> {
  const [a, c, d, i] = await Promise.all([
    supabase.from("allergies").select("*").eq("user_id", userId).order("added_at", { ascending: false }),
    supabase.from("conditions").select("*").eq("user_id", userId).order("added_at", { ascending: false }),
    supabase.from("dependents").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("insurance_cards").select("*").eq("user_id", userId).order("added_at", { ascending: false }),
  ]);

  if (a.error) throw a.error;
  if (c.error) throw c.error;
  if (d.error) throw d.error;
  if (i.error) throw i.error;

  return {
    allergies:  (a.data as AllergyRow[]        | null ?? []).map(rowToAllergy),
    conditions: (c.data as ConditionRow[]      | null ?? []).map(rowToCondition),
    dependents: (d.data as DependentRow[]      | null ?? []).map(rowToDependent),
    insurance:  (i.data as InsuranceCardRow[]  | null ?? []).map(rowToInsuranceCard),
  };
}

export interface UseHealthProfileQueryResult {
  isLoading: boolean;
  isError:   boolean;
  error:     Error | null;
  refetch:   () => void;
}

export function useHealthProfileQuery(userId: string | undefined): UseHealthProfileQueryResult {
  const hydrate = useHealthProfileStore((s) => s.hydrate);

  const query = useQuery({
    queryKey: ["healthProfile", userId],
    queryFn:  () => fetchHealthProfile(userId as string),
    enabled:  !!userId,
  });

  useEffect(() => {
    if (query.data) hydrate(query.data);
  }, [query.data, hydrate]);

  return {
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error as Error | null,
    refetch:   query.refetch,
  };
}
