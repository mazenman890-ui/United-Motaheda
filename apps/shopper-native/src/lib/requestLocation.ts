/**
 * requestLocation — ask for GPS permission and store coordinates.
 *
 * Called once after the user signs in or registers so the delivery
 * context has real coordinates immediately for the first cart session.
 * Silent on denial — the user can always grant it later from settings.
 */

import * as Location from "expo-location";
import { useLocationState } from "@/features/delivery/locationStore";

export async function requestAndStoreLocation(): Promise<void> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    useLocationState.getState().setCoordinates({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    });
    useLocationState.getState().setPermission("granted");
  } catch {
    // GPS unavailable (emulator, denied, timeout) — fail silently
  }
}
