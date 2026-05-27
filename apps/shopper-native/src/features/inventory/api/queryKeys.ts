/**
 * Inventory keys. Rooted at `"inventory"` — not in SENSITIVE_PREFIXES, but
 * intentionally short-staleTime in hooks so a 5-minute-old persisted entry
 * never drives a checkout decision; the RPC re-validates on commit.
 */

export const inventoryKeys = {
  all:        ["inventory"] as const,
  state:      (productId: string) =>
    ["inventory", "state", productId] as const,
  validation: (productId: string, qty: number) =>
    ["inventory", "validate", productId, qty] as const,
  userReservations: () =>
    ["inventory", "user-reservations"] as const,
};
