import { publicEnv } from "./env";

export type ShippingAddressInput = {
  city?: string;
  streetName?: string;
  buildingNumber?: string;
  floor?: string;
  apartmentNumber?: string;
};

type ShippingZone = {
  city: string;
  fee: number;
};

const DEFAULT_SHIPPING_ZONES: ShippingZone[] = [];

function normalizeCity(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function readShippingZones(): ShippingZone[] {
  if (!publicEnv.shippingMatrixJson) {
    return DEFAULT_SHIPPING_ZONES;
  }

  try {
    const parsed = JSON.parse(publicEnv.shippingMatrixJson) as Array<{
      city?: unknown;
      fee?: unknown;
    }>;

    if (!Array.isArray(parsed)) {
      return DEFAULT_SHIPPING_ZONES;
    }

    return parsed
      .map((entry) => ({
        city: String(entry.city ?? "").trim(),
        fee: Number(entry.fee),
      }))
      .filter((entry) => entry.city && Number.isFinite(entry.fee) && entry.fee >= 0);
  } catch {
    return DEFAULT_SHIPPING_ZONES;
  }
}

const SHIPPING_ZONES = readShippingZones();

export function calculateShipping(address: ShippingAddressInput | null | undefined): number {
  const normalizedCity = normalizeCity(address?.city);

  if (!normalizedCity) {
    return publicEnv.deliveryFee;
  }

  const matchedZone = SHIPPING_ZONES.find((zone) => normalizeCity(zone.city) === normalizedCity);

  if (!matchedZone) {
    return publicEnv.deliveryFee;
  }

  return matchedZone.fee;
}
