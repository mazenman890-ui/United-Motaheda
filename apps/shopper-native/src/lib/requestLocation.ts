/**
 * requestAndStoreLocation — ask for GPS and store coordinates.
 *
 * Uses the standard Web Geolocation API (navigator.geolocation) which
 * works on both web browsers and React Native / Expo without requiring
 * any extra package. Called once after login/register so the delivery
 * context has real coordinates from the first cart session.
 */

import { useLocationState } from "@/features/delivery/locationStore";

export function requestAndStoreLocation(): void {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      useLocationState.getState().setCoordinates({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      useLocationState.getState().setPermission("granted");
    },
    () => {
      useLocationState.getState().setPermission("denied");
    },
    {
      enableHighAccuracy: true,
      timeout:            8_000,
      maximumAge:         60_000,
    },
  );
}
