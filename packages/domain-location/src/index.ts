import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getApiClient } from "@pharmacy/api-client";
import { emitWorkflowEvent, queryKeys } from "@pharmacy/domain-core";
import type { CartSnapshot, Coordinates } from "@pharmacy/types";
import type { DeliveryStatus } from "@pharmacy/contracts";

type LocationState = {
  coordinates: Coordinates | null;
  permission: "idle" | "granted" | "denied";
  selectedArea: string;
  selectedBranchId: string;
  setCoordinates: (coordinates: Coordinates) => void;
  setPermission: (permission: LocationState["permission"]) => void;
  setSelectedArea: (area: string) => void;
  setSelectedBranchId: (branchId: string) => void;
};

const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      coordinates: null,
      permission: "idle",
      selectedArea: "",
      selectedBranchId: "",
      setCoordinates: (coordinates) => set({ coordinates }),
      setPermission: (permission) => set({ permission }),
      setSelectedArea: (selectedArea) => set({ selectedArea }),
      setSelectedBranchId: (selectedBranchId) => set({ selectedBranchId }),
    }),
    {
      name: "pharmacy-location-v1",
      storage:
        typeof window === "undefined"
          ? undefined
          : createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        coordinates: state.coordinates,
        permission: state.permission,
        selectedArea: state.selectedArea,
        selectedBranchId: state.selectedBranchId,
      }),
    },
  ),
);

function buildSignature(
  cart: CartSnapshot,
  coordinates: Coordinates | null,
  label?: string,
  requestedBranchId?: string,
) {
  const itemSignature = cart.items
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join("|");

  if (!coordinates) {
    return `no-coordinates:${requestedBranchId ?? ""}:${label ?? ""}:${itemSignature}`;
  }

  return `${coordinates.lat}:${coordinates.lng}:${requestedBranchId ?? ""}:${label ?? ""}:${itemSignature}`;
}

export function useLocationState(): LocationState;
export function useLocationState<T>(selector: (state: LocationState) => T): T;
export function useLocationState<T>(selector?: (state: LocationState) => T) {
  return selector ? useLocationStore(selector) : useLocationStore();
}

export function useBrowserLocation(enabled = true) {
  const setCoordinates = useLocationStore((state) => state.setCoordinates);
  const setPermission = useLocationStore((state) => state.setPermission);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setPermission("granted");
        emitWorkflowEvent("LocationResolved", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "browser",
        });
      },
      () => {
        setCoordinates(null);
        setPermission("denied");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 8_000,
      },
    );
  }, [enabled, setCoordinates, setPermission]);
}

export function useDeliveryQuote(cart: CartSnapshot, label?: string, requestedBranchId?: string) {
  const coordinates = useLocationStore((state) => state.coordinates);
  const apiClient = useMemo(() => getApiClient(), []);
  const signature = buildSignature(cart, coordinates, label, requestedBranchId);

  const query = useQuery<DeliveryStatus>({
    queryKey: queryKeys.quote(signature),
    enabled: Boolean(coordinates) && cart.itemCount > 0,
    queryFn: async () => {
      const nextQuote = await apiClient.quoteCheckout({
        coordinates: coordinates as Coordinates,
        cart,
        label,
        requestedBranchId,
      });

      emitWorkflowEvent("AssignmentRecomputed", {
        pharmacyId: nextQuote.branch?.id ?? "unknown",
        quoteToken: nextQuote.quoteToken ?? "unknown",
      });
      emitWorkflowEvent("QuoteRefreshed", {
        fee: nextQuote.cost ?? 0,
        quoteToken: nextQuote.quoteToken ?? "unknown",
      });

      return nextQuote;
    },
  });

  return query;
}
