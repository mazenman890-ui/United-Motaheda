import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  search: (query: string, lang: string) => ["search", lang, query] as const,
  assignment: (signature: string) => ["assignment", signature] as const,
  quote: (signature: string) => ["quote", signature] as const,
  prescriptions: () => ["prescriptions"] as const,
  tracking: (orderId: string) => ["tracking", orderId] as const,
  courierManifest: (driverId: string) => ["courier-manifest", driverId] as const,
};

let sharedQueryClient: QueryClient | null = null;

export function createMonorepoQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function getSharedQueryClient() {
  if (!sharedQueryClient) {
    sharedQueryClient = createMonorepoQueryClient();
  }

  return sharedQueryClient;
}
