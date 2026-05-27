-- ============================================================
-- United Pharmacies – Branch + Delivery Zone seed
-- Run this once in Supabase SQL Editor (public schema)
-- ============================================================

-- ── 1. Upsert the 5 Cairo branches ──────────────────────────

INSERT INTO public."Branch" (id, "nameAr", "nameEn", governorate, area, address, lat, lng, "mapEmbedSrc", "isActive", "createdAt", "updatedAt")
VALUES
  (
    'gardenia',
    'صيدليات المتحدة - جاردينيا',
    'United Pharmacies - Gardenia',
    'Cairo', 'القاهرة الجديدة',
    'كومباوند، مول جاردينيا سيتي وراك كومباوند, Cairo Governorate 11511',
    30.0827, 31.3853,
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3452.31!2d31.3853!3d30.0827!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDA0JzU3LjciTiAzMcKwMjMnMDcuMSJF!5e0!3m2!1sen!2seg!4v1',
    true, now(), now()
  ),
  (
    'maadi',
    'صيدليات المتحدة - شارع فلسطين',
    'United Pharmacies - Palestine Street',
    'Cairo', 'المعادي',
    '1 Palestine Rd, El-Basatin Sharkeya, Maadi, Cairo Governorate 4234320',
    30.0146, 31.2824,
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3454.8!2d31.2824!3d30.0146!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAwJzUyLjYiTiAzMcKwMTYnNTYuNiJF!5e0!3m2!1sen!2seg!4v1',
    true, now(), now()
  ),
  (
    'nasr-city-hay-asher',
    'صيدليات المتحدة - الحي العاشر',
    'United Pharmacies - Al Hay Al Asher',
    'Cairo', 'مدينة نصر',
    '29XR+3JR, Al Hay Al Asher, Nasr City, Cairo Governorate 4444137',
    30.0485, 31.3533,
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.5!2d31.3533!3d30.0485!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAyJzU0LjYiTiAzMcKwMjEnMTEuOSJF!5e0!3m2!1sen!2seg!4v1',
    true, now(), now()
  ),
  (
    'zahraa-gomhoureya',
    'صيدليات المتحدة - زهراء الجمهورية',
    'United Pharmacies - Zahraa El Gomhoureya',
    'Cairo', 'مدينة نصر',
    'فرع ش الجمهورية ع١٤ زهراء مدينة نصر',
    30.0650, 31.3780,
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3452.9!2d31.3780!3d30.0650!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAzJzU0LjAiTiAzMcKwMjInNDAuOCJF!5e0!3m2!1sen!2seg!4v1',
    true, now(), now()
  ),
  (
    'zahraa-madinet-nasr',
    'صيدليات المتحدة - مدينة نصر',
    'United Pharmacies - Nasr City',
    'Cairo', 'مدينة نصر',
    '29WR+XHF, Fatma El-Zahraa Rd, Al Hay Al Asher, Nasr City, Cairo Governorate 4444134',
    30.0520, 31.3550,
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.3!2d31.3550!3d30.0520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAzJzA3LjIiTiAzMcKwMjEnMTguMCJF!5e0!3m2!1sen!2seg!4v1',
    true, now(), now()
  )
ON CONFLICT (id) DO UPDATE SET
  "nameAr"      = EXCLUDED."nameAr",
  "nameEn"      = EXCLUDED."nameEn",
  governorate   = EXCLUDED.governorate,
  area          = EXCLUDED.area,
  address       = EXCLUDED.address,
  lat           = EXCLUDED.lat,
  lng           = EXCLUDED.lng,
  "mapEmbedSrc" = EXCLUDED."mapEmbedSrc",
  "isActive"    = EXCLUDED."isActive",
  "updatedAt"   = now();

-- ── 2. Upsert delivery zones (one zone per branch) ──────────
-- baseFee = 25 EGP, free delivery above 500 EGP subtotal,
-- surge 00:00-06:00 × 1.25

INSERT INTO public."DeliveryZone" (id, "branchId", name, polygon, "baseFee", "freeAboveSubtotal", "surgeStartHour", "surgeEndHour", "surgeMultiplier", "createdAt", "updatedAt")
VALUES
  -- Nasr City – Fatma El-Zahraa  (hand-drawn polygon)
  (
    'zahraa-madinet-nasr-zone-1', 'zahraa-madinet-nasr', 'Primary Zone',
    '{"points":[{"lat":30.08,"lng":31.39},{"lat":30.08,"lng":31.35},{"lat":30.06,"lng":31.335},{"lat":30.03,"lng":31.345},{"lat":30.025,"lng":31.38},{"lat":30.04,"lng":31.405},{"lat":30.07,"lng":31.4}]}',
    25, 500, 0, 6, 1.25, now(), now()
  ),
  -- Gardenia City / New Cairo  (hand-drawn polygon)
  (
    'gardenia-zone-1', 'gardenia', 'Primary Zone',
    '{"points":[{"lat":30.125,"lng":31.415},{"lat":30.125,"lng":31.365},{"lat":30.105,"lng":31.35},{"lat":30.07,"lng":31.36},{"lat":30.065,"lng":31.41},{"lat":30.085,"lng":31.43},{"lat":30.11,"lng":31.425}]}',
    25, 500, 0, 6, 1.25, now(), now()
  ),
  -- Maadi – Palestine Rd  (hand-drawn polygon)
  (
    'maadi-zone-1', 'maadi', 'Primary Zone',
    '{"points":[{"lat":30.04,"lng":31.305},{"lat":30.04,"lng":31.255},{"lat":30.02,"lng":31.24},{"lat":29.985,"lng":31.25},{"lat":29.98,"lng":31.295},{"lat":30.0,"lng":31.32},{"lat":30.025,"lng":31.315}]}',
    25, 500, 0, 6, 1.25, now(), now()
  ),
  -- Nasr City – Al Hay Al Asher  (bounding box ±0.02°)
  (
    'nasr-city-hay-asher-zone-1', 'nasr-city-hay-asher', 'Primary Zone',
    '{"points":[{"lat":30.0285,"lng":31.3333},{"lat":30.0285,"lng":31.3733},{"lat":30.0685,"lng":31.3733},{"lat":30.0685,"lng":31.3333}]}',
    25, 500, 0, 6, 1.25, now(), now()
  ),
  -- Nasr City – Zahraa El Gomhoureya  (bounding box ±0.02°)
  (
    'zahraa-gomhoureya-zone-1', 'zahraa-gomhoureya', 'Primary Zone',
    '{"points":[{"lat":30.0450,"lng":31.3580},{"lat":30.0450,"lng":31.3980},{"lat":30.0850,"lng":31.3980},{"lat":30.0850,"lng":31.3580}]}',
    25, 500, 0, 6, 1.25, now(), now()
  )
ON CONFLICT (id) DO UPDATE SET
  polygon            = EXCLUDED.polygon,
  "baseFee"          = EXCLUDED."baseFee",
  "freeAboveSubtotal"= EXCLUDED."freeAboveSubtotal",
  "surgeStartHour"   = EXCLUDED."surgeStartHour",
  "surgeEndHour"     = EXCLUDED."surgeEndHour",
  "surgeMultiplier"  = EXCLUDED."surgeMultiplier",
  "updatedAt"        = now();

-- ── 3. Remove any stale branches not in this list ───────────
DELETE FROM public."Branch"
WHERE id NOT IN ('gardenia','maadi','nasr-city-hay-asher','zahraa-gomhoureya','zahraa-madinet-nasr');

-- ── Verify ──────────────────────────────────────────────────
SELECT b.id, b."nameAr", b.area, count(z.id) AS zone_count
FROM public."Branch" b
LEFT JOIN public."DeliveryZone" z ON z."branchId" = b.id
GROUP BY b.id, b."nameAr", b.area
ORDER BY b.area;
