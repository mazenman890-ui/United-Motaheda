/**
 * Classic Google Maps embed using WGS84 coordinates so the pin matches the branch,
 * not a fuzzy geocode of free-text addresses.
 */
export function hasValidCoordinates(lat: number | null | undefined, lng: number | null | undefined) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function buildGoogleMapsEmbedSrc(
  lat: number,
  lng: number,
  zoom = 17,
  lang: "ar" | "en" = "en",
) {
  if (!hasValidCoordinates(lat, lng)) {
    return "";
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=${zoom}&output=embed&hl=${lang}`;
}
