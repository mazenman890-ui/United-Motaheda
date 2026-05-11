import { getApiClient } from "@pharmacy/api-client";
import type { Branch } from "@pharmacy/contracts";

export type ApiBranch = Branch;

export async function fetchBranches(): Promise<ApiBranch[]> {
  return getApiClient().listBranches();
}
