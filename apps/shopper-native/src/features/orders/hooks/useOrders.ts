/**
 * useOrders — React Query wrapper around the orders API.
 *
 * Keeps the Zustand orders store in sync as a side-effect so that
 * PharmacyBootstrap callers and offline caching still work unchanged.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchUserOrders, fetchOrderById } from "../api";
import { useOrderStore, type Order } from "@/stores/orders";

export const ordersQueryKeys = {
  list:   (userId: string)  => ["orders", "list",   userId] as const,
  detail: (orderId: string) => ["orders", "detail", orderId] as const,
};

/** Fetch all orders for the authenticated user. */
export function useOrders(userId: string | null | undefined) {
  const setOrdersCache = useOrderStore((s) => s.hydrate);
  const queryClient    = useQueryClient();

  const query = useQuery<Order[], Error>({
    queryKey:    ordersQueryKeys.list(userId ?? ""),
    queryFn:     () => fetchUserOrders(userId!),
    enabled:     Boolean(userId),
    staleTime:   30_000,
    gcTime:      5 * 60_000,
    retry:       2,
    refetchOnWindowFocus: false,
  });

  // Keep Zustand store in sync so offline cache + PharmacyBootstrap are happy.
  useEffect(() => {
    if (query.data && userId) {
      // Sync directly into the store's in-memory list without re-fetching.
      useOrderStore.setState({
        orders:     query.data,
        isHydrated: true,
        loading:    false,
      });
    }
  }, [query.data, userId]);

  return query;
}

/** Fetch a single order by ID — used by the OrderDetails screen. */
export function useOrderDetail(orderId: string | null | undefined) {
  return useQuery<Order | null, Error>({
    queryKey:  ordersQueryKeys.detail(orderId ?? ""),
    queryFn:   () => fetchOrderById(orderId!),
    enabled:   Boolean(orderId),
    staleTime: 20_000,
    gcTime:    5 * 60_000,
    retry:     2,
    refetchOnWindowFocus: false,
  });
}

/** Invalidate the orders list cache — call after checkout success. */
export function invalidateOrders(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.list(userId) });
}
