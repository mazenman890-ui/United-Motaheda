/**
 * Location store — central source of truth for delivery context.
 *
 * Mirrors the web canonical `useLocationState` from
 * `@pharmacy/domain-location`. Holds:
 *
 *   - `coordinates`        : last-known customer position (GPS or geocoded
 *                            from selected address). Used to find the
 *                            nearest delivery branch.
 *   - `selectedBranchId`   : explicit branch override (set when the user
 *                            picks one at checkout). When null, the
 *                            delivery engine snaps to nearest by coords.
 *   - `selectedArea`       : free-text region label (e.g. "New Cairo"),
 *                            used by analytics and by the legacy
 *                            text-only address fallback in
 *                            `useDeliveryQuote` when coords aren't yet
 *                            available.
 *
 * Persistence:
 *   - All three fields persist to AsyncStorage so the cart/drawer pricing
 *     stays branch-aware across app restarts (same as web localStorage).
 *
 * Reactive consumers:
 *   - `useDeliveryContext` (the unified pricing hook) re-runs `useMemo`
 *     whenever any of these fields change.
 *   - Cart screen, CartDrawer, and Checkout subscribe via per-field
 *     selectors so they only re-render when the field they care about
 *     actually changes (avoids whole-store invalidation cascades).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocationPermission = "idle" | "granted" | "denied";

export interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationState {
  coordinates:        Coordinates | null;
  permission:         LocationPermission;
  selectedArea:       string;
  selectedBranchId:   string | null;
  setCoordinates:     (coords: Coordinates | null) => void;
  setPermission:      (permission: LocationPermission) => void;
  setSelectedArea:    (area: string) => void;
  setSelectedBranchId:(branchId: string | null) => void;
  reset:              () => void;
}

const STORAGE_KEY = "pharmacy-location-v1";

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      coordinates:      null,
      permission:       "idle",
      selectedArea:     "",
      selectedBranchId: null,
      setCoordinates:     (coordinates)      => set({ coordinates }),
      setPermission:      (permission)       => set({ permission }),
      setSelectedArea:    (selectedArea)     => set({ selectedArea }),
      setSelectedBranchId:(selectedBranchId) => set({ selectedBranchId }),
      reset:              () => set({
        coordinates:      null,
        permission:       "idle",
        selectedArea:     "",
        selectedBranchId: null,
      }),
    }),
    {
      name:    STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the user-facing state — the setters are recreated.
      partialize: (state) => ({
        coordinates:      state.coordinates,
        permission:       state.permission,
        selectedArea:     state.selectedArea,
        selectedBranchId: state.selectedBranchId,
      }),
    },
  ),
);

/**
 * Granular selector-based subscription helper.
 *
 *   const branchId = useLocationState((s) => s.selectedBranchId);
 *
 * The selector is REQUIRED — passing none would subscribe to the whole store
 * and cause re-renders on every field change, defeating the point of this
 * helper.  All call sites already use a selector (confirmed: no bare
 * `useLocationState()` callers exist in the codebase).
 */
export function useLocationState<T>(selector: (state: LocationState) => T): T {
  return useLocationStore(selector);
}
