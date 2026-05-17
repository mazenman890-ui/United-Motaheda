import { useQuery } from "@tanstack/react-query";
import { BRANCHES } from "./data";
import { fetchBranches } from "./api";
import type { Branch } from "./types";

export function useBranches() {
  return useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    initialData: [...BRANCHES],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
