/**
 * Inventory — public barrel.
 *
 * Integration map (separate slice from this one — files NOT yet edited):
 *
 *   cart store        → useReserveInventory on add, useReleaseInventory on remove
 *   checkout submit   → useCommitInventory per cart line after orders.insert
 *   product detail    → useInventoryState for the "in stock / low / OOS" badge
 *   order cancel      → admin rollback_committed_reservation RPC
 */

export type {
  AvailableInventory,
  AvailabilityState,
  ValidateInventoryResult,
  ReservationKind,
  ReservationState,
  ReserveResponse,
  ReleaseResponse,
  CommitResponse,
  ExtendResponse,
} from "./types";

export {
  fetchInventoryState,
  validateInventory,
  reserveInventory,
  releaseInventory,
  commitInventory,
  extendReservation,
} from "./api/inventoryApi";

export { inventoryKeys }      from "./api/queryKeys";

export { useInventoryState }      from "./hooks/useInventoryState";
export { useValidateInventory }   from "./hooks/useValidateInventory";
export { useReserveInventory }    from "./hooks/useReserveInventory";
export { useReleaseInventory }    from "./hooks/useReleaseInventory";
export { useCommitInventory }     from "./hooks/useCommitInventory";
