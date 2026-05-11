import { useQuery } from "@tanstack/react-query";
import { fetchBranches, type ApiBranch } from "../../services/branchesApi";

export type { ApiBranch };

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
