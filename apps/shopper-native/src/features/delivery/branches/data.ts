/**
 * Branch seed data — ported from shopper-web/src/app/data.ts.
 *
 * Five Cairo branches with WGS84 coordinates. Hours/phones come from the
 * web reference and should stay in sync. When this moves to Supabase, this
 * file becomes the offline fallback only.
 */

import type { Branch } from "./types";

const HOURS_AR = "كل الأيام • من 9:00 صباحاً حتى 11:00 مساءً";
const HOURS_EN = "Every day • 9:00 AM – 11:00 PM";

const SUPPORT_LINE  = "01012255595";
const WHATSAPP_LINE = "01112343212";
const ZAHRAA_LINE   = "01090530095";

const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

export const BRANCHES: readonly Branch[] = [
  {
    id:              "gardenia",
    nameAr:          "جاردينيا",
    nameEn:          "Gardenia",
    fullNameAr:      "صيدليات المتحدة - جاردينيا",
    fullNameEn:      "United Pharmacies - Gardenia",
    addressAr:       "جاردينيا، القاهرة الجديدة، القاهرة",
    addressEn:       "Gardenia, New Cairo, Cairo",
    phones:          [SUPPORT_LINE, WHATSAPP_LINE],
    hoursAr:         HOURS_AR,
    hoursEn:         HOURS_EN,
    lat:             30.0827,
    lng:             31.3853,
    mapZoom:         16,
    isPrimary:       true,
    governorate:     "Cairo",
    area:            "القاهرة الجديدة",
    deliveryEnabled: true,
    mapsDirectionsUrl: directionsUrl(30.0827, 31.3853),
  },
  {
    id:              "maadi",
    nameAr:          "شارع فلسطين",
    nameEn:          "Palestine Street",
    fullNameAr:      "صيدليات المتحدة - شارع فلسطين",
    fullNameEn:      "United Pharmacies - Palestine Street",
    addressAr:       "١ شارع فلسطين، البساتين الشرقية، المعادي، القاهرة",
    addressEn:       "1 Palestine Rd, El-Basatin Sharkeya, Maadi, Cairo",
    phones:          [SUPPORT_LINE, WHATSAPP_LINE],
    hoursAr:         HOURS_AR,
    hoursEn:         HOURS_EN,
    lat:             30.0146,
    lng:             31.2824,
    mapZoom:         17,
    isPrimary:       false,
    governorate:     "Cairo",
    area:            "المعادي",
    deliveryEnabled: true,
    mapsDirectionsUrl: directionsUrl(30.0146, 31.2824),
  },
  {
    id:              "nasr-city-hay-asher",
    nameAr:          "الحي العاشر",
    nameEn:          "Al Hay Al Asher",
    fullNameAr:      "صيدليات المتحدة - الحي العاشر",
    fullNameEn:      "United Pharmacies - Al Hay Al Asher",
    addressAr:       "الحي العاشر، مدينة نصر، القاهرة",
    addressEn:       "Al Hay Al Asher, Nasr City, Cairo",
    phones:          [ZAHRAA_LINE, WHATSAPP_LINE],
    hoursAr:         HOURS_AR,
    hoursEn:         HOURS_EN,
    lat:             30.0485,
    lng:             31.3533,
    mapZoom:         17,
    isPrimary:       false,
    governorate:     "Cairo",
    area:            "مدينة نصر",
    deliveryEnabled: true,
    mapsDirectionsUrl: directionsUrl(30.0485, 31.3533),
  },
  {
    id:              "zahraa-gomhoureya",
    nameAr:          "شارع الجمهورية",
    nameEn:          "El Gomhoureya St.",
    fullNameAr:      "صيدليات المتحدة - زهراء الجمهورية",
    fullNameEn:      "United Pharmacies - Zahraa El Gomhoureya",
    addressAr:       "شارع الجمهورية ع١٤، زهراء مدينة نصر، القاهرة",
    addressEn:       "El Gomhoureya St. #14, Zahraa Nasr City, Cairo",
    phones:          [ZAHRAA_LINE, WHATSAPP_LINE],
    hoursAr:         HOURS_AR,
    hoursEn:         HOURS_EN,
    lat:             30.0650,
    lng:             31.3780,
    mapZoom:         16,
    isPrimary:       false,
    governorate:     "Cairo",
    area:            "مدينة نصر",
    deliveryEnabled: true,
    mapsDirectionsUrl: directionsUrl(30.0650, 31.3780),
  },
  {
    id:              "zahraa-madinet-nasr",
    nameAr:          "طريق فاطمة الزهراء",
    nameEn:          "Fatma El-Zahraa Rd.",
    fullNameAr:      "صيدليات المتحدة - مدينة نصر",
    fullNameEn:      "United Pharmacies - Nasr City",
    addressAr:       "طريق فاطمة الزهراء، الحي العاشر، مدينة نصر، القاهرة",
    addressEn:       "Fatma El-Zahraa Rd, Al Hay Al Asher, Nasr City, Cairo",
    phones:          [ZAHRAA_LINE, WHATSAPP_LINE],
    hoursAr:         HOURS_AR,
    hoursEn:         HOURS_EN,
    lat:             30.0520,
    lng:             31.3550,
    mapZoom:         17,
    isPrimary:       false,
    governorate:     "Cairo",
    area:            "مدينة نصر",
    deliveryEnabled: true,
    mapsDirectionsUrl: directionsUrl(30.0520, 31.3550),
  },
];

export const DELIVERY_BRANCHES = BRANCHES.filter((b) => b.deliveryEnabled);

export function findBranchById(id: string | null | undefined): Branch | null {
  if (!id) return null;
  return BRANCHES.find((b) => b.id === id) ?? null;
}

export function getPrimaryBranch(): Branch {
  return BRANCHES.find((b) => b.isPrimary) ?? BRANCHES[0];
}
