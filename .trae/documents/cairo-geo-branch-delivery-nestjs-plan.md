# Pharmacy E‑commerce Platform (Cairo‑Locked) — Full‑Stack Skeleton Plan

## Summary
Implement a production-grade, scalable Pharmacy e-commerce foundation inside the existing monorepo:

- **Frontend (apps/shopper-web)**: Cairo-only location lock, branch selection (name + area) with future GPS auto-assign, per-branch embedded Google Maps **iframe** rendering (5 provided embeds), geofence validation UI, and a **perpetually accessible Admin portal entry** on all device sizes (no `display:none` hiding on mobile).
- **Backend (new NestJS app)**: Clean Architecture-inspired layering (controllers → application services → domain logic → infrastructure), PostgreSQL + Prisma models (Branch, DeliveryZone, Product, Medication, Order), consistent API response wrapper `{ success, data, error }`, and request validation via **Zod and/or class-validator**.
- **Shared contracts**: Introduce a runtime-validated, strongly typed contract package used by both frontend and backend.

## Current State Analysis (repo-grounded)
### Monorepo structure
- Root is a workspace monorepo with `apps/*` and `packages/*`.
- Shopper frontend lives in: `apps/shopper-web/` (React + Vite + TS + Tailwind).
- Shared packages already exist:
  - `packages/types` (shared TS types; includes `Coordinates`, `PharmacyBranch`, `DeliveryQuote`, etc.)
  - `packages/api-client` (currently includes **local** logic: haversine nearest-branch assignment, static fee, ETA band)
  - `packages/domain-location` (Zustand store + TanStack Query hook calling `api-client`)

### Admin accessibility gap (must fix)
- Admin routes exist under `/admin` and are protected via `AdminRouteProtection` and admin pages.
- The “Admin Dashboard” header link in `apps/shopper-web/src/app/layout.tsx` is **desktop-only** (`hidden xl:inline-flex`), and the user menu that contains the admin link is also **desktop-only** (`hidden xl:block`).
- Therefore, on mobile/tablet, admin navigation is not guaranteed visible, violating the “always accessible” constraint.

### Location/shipping logic gap
- `apps/shopper-web/src/app/shippingConfig.ts` calculates shipping primarily using city-based rules and environment JSON.
- Existing quote logic in `packages/api-client` is placeholder and does not enforce Cairo-only, geofence polygons, thresholds, surge, or consistent API wrapper.

## Assumptions & Decisions (decision-complete)
1. **Backend stack**: NestJS + Prisma + PostgreSQL (as requested).
2. **Geofence polygons**: Start with **placeholder polygons** stored in DB and seeded; later replaced with real territory polygons.
3. **Polygon storage**: Use Prisma `Json` for polygon coordinates initially (fastest to implement and compatible). If later migrating to PostGIS, keep contract compatible (GeoJSON-like).
4. **Cairo lock**: Governorate is hardcoded in UI as `"Cairo"` (read-only; no dropdown). Backend additionally rejects requests outside Cairo service boundaries (via zones/branch matching).
5. **Validation**:
   - Use **Zod** for shared contracts and for complex payload validation (cart snapshots, polygons).
   - Use **class-validator** for simple Nest DTO validation where beneficial.
6. **Admin entry visibility**:
   - Always display an “Admin” entry on mobile navigation.
   - If user is not authorized, they may still navigate to `/admin`, but route protection must redirect to login/unauthorized (authorization stays server/client enforced).

## Proposed Changes

### A) Shared API Contracts (new package)
**Goal**: One source of truth for payload shapes (runtime validation + compile-time types).

#### New files
1. `packages/contracts/package.json`
2. `packages/contracts/src/index.ts`
3. `packages/contracts/src/apiResponse.ts`
4. `packages/contracts/src/geo.ts`
5. `packages/contracts/src/branch.ts`
6. `packages/contracts/src/delivery.ts`
7. `packages/contracts/src/order.ts`

#### Contract contents (what/why/how)
- **API wrapper**
  - `ApiErrorSchema` (`{ code, message, details? }`)
  - `ApiResponseSchema<T>` as a discriminated union:
    - `{ success: true, data: T, error: null }`
    - `{ success: false, data: null, error: ApiError }`
- **Geo + Geofence**
  - `CoordinatesSchema` (`{ lat, lng }`)
  - `PolygonSchema`: `{ points: Coordinates[] }`
  - `pointInPolygon(point, polygon)` pure utility (shared) for placeholder validation and deterministic behavior across FE/BE.
- **Branches**
  - `BranchSchema`: id, nameAr/nameEn, governorate (literal `"Cairo"`), area, lat, lng, `mapEmbedSrc?`, `isActive`.
- **Delivery / Quote**
  - `CartSnapshotSchema` (reuse/align with existing `packages/types` cart snapshot shape)
  - `DeliveryQuoteRequestSchema`: `{ coordinates, cart, requestedBranchId? }`
  - `DeliveryStatusSchema`:
    - `isDeliverable: boolean`
    - `cost: number | null`
    - `currency: "EGP"`
    - `eta: { minMinutes, maxMinutes } | null`
    - `branch: Branch | null`
    - `zoneId?: string | null`
    - `reasonCode?: "OUT_OF_ZONE" | "NO_BRANCH" | "NO_COORDINATES" | "OK" | ...`
    - `breakdown?: { baseFee, surgeMultiplier, freeDeliveryApplied }`
- **Orders**
  - `CreateOrderRequestSchema` using quote token + assignment + delivery snapshot.

#### Integration decision
- Update `packages/types` to either:
  - (Preferred) **re-export** from `packages/contracts` where overlap exists to prevent drift, or
  - (Minimal) keep `packages/types` and only use `packages/contracts` for API payloads.  
This plan assumes **Preferred** to ensure 100% type safety without duplication.

---

### B) Backend (NestJS + Prisma) — New API app
**Goal**: Cleanly separated, production-ready API skeleton with consistent responses and delivery/geofence enforcement.

#### New app structure
Create `apps/api/` (NestJS):
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/`
  - `api-response.interceptor.ts` (wrap successful responses)
  - `http-exception.filter.ts` (wrap errors into `{success:false,...}`)
  - `zod-validation.pipe.ts` (optional: validate request bodies using Zod schemas)
- `apps/api/src/modules/branches/` (controller + service)
- `apps/api/src/modules/delivery/` (controller + service)
- `apps/api/src/modules/orders/` (controller + service)
- `apps/api/src/modules/products/` and/or `medications/` (skeleton endpoints)

#### Prisma setup
Add Prisma under `apps/api/prisma/`:
- `schema.prisma`
- `migrations/` (via prisma migrate)
- `seed.ts` (seed 5 branches + placeholder zones)

##### Required models (minimum viable)
- `Branch`
  - `id` (cuid/uuid), `nameAr`, `nameEn`, `governorate`, `area`, `lat`, `lng`, `mapEmbedSrc?`, `isActive`
- `DeliveryZone`
  - `id`, `branchId`, `name`, `polygon` (Json), `baseFee`
  - `freeAboveSubtotal` (number), `surgeStartHour?`, `surgeEndHour?`, `surgeMultiplier?`
- `Product`
  - id, code/sku, nameAr/nameEn, price, stock, imageUrl?
- `Medication`
  - id, productId (1:1), `prescriptionRequired` boolean, `dosageInformation` string (placeholder)
- `Order`, `OrderItem`
  - order contains customer + address + coordinates(Json) + branchId + zoneId + pricing snapshots

#### Endpoint contracts
1. `GET /branches`
   - Returns list of `Branch` with `mapEmbedSrc` and area.
2. `POST /delivery/quote`
   - Request: `DeliveryQuoteRequestSchema`
   - Behavior:
     - Validate coordinates.
     - If `requestedBranchId` exists: check if point in any zone for that branch; else compute best branch by matching zones.
     - If not in any zone: return `DeliveryStatus.isDeliverable=false` with reason `OUT_OF_ZONE`.
     - Compute cost:
       - Base fee from zone
       - If cart subtotal ≥ threshold: cost = 0
       - Apply surge multiplier if current time is within surge window
     - Return `DeliveryStatus` (strongly typed).
3. `POST /orders`
   - Server re-validates zone deliverability at order time.
   - Saves order + items, returns `Order` via wrapper.

#### Clean Architecture alignment
Within each module:
- **Controller**: request parsing + calling application service.
- **Application service**: orchestration (quote rules, persistence).
- **Domain utilities**: pure functions like `pointInPolygon`, surge calculation, threshold application (ideally imported from `packages/contracts`).
- **Infrastructure**: Prisma repository (DB access).

---

### C) Frontend (shopper-web) — Cairo lock, branches, iframes, geofence UX
**Goal**: Premium, fluid UX with strict Cairo restriction and correct map embeds, while preserving scalable architecture.

#### Component Architecture (React tree)
Proposed high-level tree (new/updated items marked):
- `App`
  - `ShopperMobileLayout`
    - `SiteHeader`
      - `AdminShortcut` *(updated: visible on all devices)*
    - `Routes`
      - `CheckoutPage`
        - `CheckoutLocationSection` *(new)*
          - `GovernorateLockPill` *(new; Cairo-only, read-only)*
          - `AreaSelect` *(new)*
          - `BranchSelect` *(new; name + area)*
          - `GeofenceStatusBanner` *(new)*
          - `BranchMapEmbed` *(new; iframe)*  
        - `DeliveryQuoteSummary` *(updated; uses API quote)*
    - `MobileBottomNav`
      - `AdminNavItem` *(new; never hidden via `display:none`)*

#### Frontend files to change/add
1. **Cairo constant**
   - New: `apps/shopper-web/src/app/constants/location.ts`
     - `export const GOVERNORATE_LOCK = "Cairo" as const;`
2. **Branch definitions and embeds**
   - Update: `apps/shopper-web/src/app/data.ts`
     - Add `area` + `governorate` + `mapEmbedSrc` fields for the 5 branches.
     - Ensure map iframe `src` is exactly the provided embed URLs.
3. **Branch selection UI**
   - New: `apps/shopper-web/src/app/components/BranchSelector.tsx`
     - Shows “Branch Name — Area”
     - Future-ready: takes optional `autoDetectEnabled` flag (for later GPS nearest-branch assignment).
   - New: `apps/shopper-web/src/app/components/BranchMapEmbed.tsx`
     - Renders `<iframe ...>` in a responsive container.
     - Uses Tailwind to be fluid:  
       - wrapper: `w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`
       - iframe: `h-[280px] w-full sm:h-[340px] lg:h-[420px]`
4. **Checkout page Cairo lock**
   - Update: `apps/shopper-web/src/app/pages/Checkout.tsx`
     - Remove/disable governorate dropdown (show locked Cairo).
     - Replace city/region/subregion selection with:
       - Area select derived from branches
       - Branch select derived from area
     - Feed selected branch into quote request: `requestedBranchId`
5. **Geofence status UX**
   - New: `apps/shopper-web/src/app/components/GeofenceStatusBanner.tsx`
     - Uses quote result:
       - deliverable → green “Deliverable” banner with ETA
       - not deliverable → red banner with “outside service zone”
6. **Admin always visible**
   - Update: `apps/shopper-web/src/app/components/MobileBottomNav.tsx`
     - Add Admin item (conditionally styled); must not be hidden with `display:none`.
   - Update: `apps/shopper-web/src/app/layout.tsx`
     - Add a mobile-visible admin entry (e.g., a compact icon button near cart/search or a small pill).
     - Constraint: never use `hidden`/`xl:hidden` to remove it on small screens; use responsive sizing instead.

---

### D) API Client + State Management wiring
**Goal**: Move delivery assignment and pricing to backend while preserving TanStack Query + Zustand architecture.

#### Files to change
1. `packages/api-client/src/index.ts`
   - Replace local `quoteCheckout` and `resolveLocation` with HTTP calls to Nest API.
   - Parse responses using Zod schemas from `packages/contracts`.
   - Keep `configureApiClient({ baseUrl })`.
2. `packages/domain-location/src/index.ts`
   - Update `useDeliveryQuote()` queryFn to call updated api-client and handle typed errors.
3. `apps/shopper-web` usage
   - Continue using TanStack Query for server state (quotes, branches).
   - Use Zustand only for lightweight client state:
     - selected area/branch, optional user-entered label/address text.

---

## Specific Map Iframe Embeds (must be used verbatim)
Store these as `mapEmbedSrc` for the corresponding branches:
- **Branch 1 (Nasr City)**: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583d8434c8d905%3A0x151767fe195e0972!2z2LXZitiv2YTZitin2Kog2KfZhNmF2KrYrdiv2KlVbml0ZWQgcGhhcm1hY2llcw!5e0!3m2!1sen!2seg!4v1778053374637!5m2!1sen!2seg`
- **Branch 2 (Gardenia City)**: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583decf6dfa0f9%3A0xfaa584f03ea1b98!2z2LXZitiv2YTZitipINin2YTZhdiq2K3Yr9ipIFVuaXRlZCBQaGFybWFjeQ!5e0!3m2!1sen!2seg!4v1778053802604!5m2!1sen!2seg`
- **Branch 3 (Nasr City - Al Ahly Club)**: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583de71a246875%3A0xf4ba68adafbe8a39!2z2KfZhNmF2KrYrdiv2Ycg2YTZhNi12YrYp9iv2YTZhyDZgdix2Lkg2YXYr9mK2YbZhyDZhti12LE!5e0!3m2!1sen!2seg!4v1778053949752!5m2!1sen!2seg`
- **Branch 4 (Maadi)**: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110594.01878468209!2d31.131900097265614!3d29.977616899999983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1458390022101dbb%3A0xffb55dd6aa99f637!2z2LXZitiv2YTZitipINin2YTZhdiq2K3Yr9ip!5e0!3m2!1sen!2seg!4v1778053994321!5m2!1sen!2seg`
- **Branch 5 (Agouza)**: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110493.43089370785!2d31.201497300000003!3d30.0678357!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14584116ce4c41b3%3A0x705cc87d7fa65d3e!2z2KfZhNi02LHZg9ipINin2YTZhdiq2K3Yr9ipINmE2YTYtdmK2KfYr9mE2Kkg2YHYsdi5INin2YTZhdmH2YbYr9iz2YrZhg!5e0!3m2!1sen!2seg!4v1778054490145!5m2!1sen!2seg`

## Verification Steps (executor checklist)
### Frontend
1. Typecheck: `npm run typecheck`
2. Build: `npm run build --workspace @pharmacy/shopper-web`
3. Manual UX checks:
   - Governorate shows Cairo and cannot be changed.
   - Branch select shows “name — area”.
   - Each branch renders the correct iframe.
   - Admin entry is visible on mobile/tablet/desktop (no CSS hiding) and routes to `/admin`.

### Backend
1. Prisma:
   - `prisma validate`
   - `prisma migrate dev`
   - `prisma db seed`
2. API contract checks:
   - `POST /delivery/quote` returns wrapper format for both success and error.
   - Out-of-zone coordinates return `isDeliverable=false` with reason code.

### Shared packages
1. Ensure `packages/contracts` builds and is imported by both FE and BE.
2. Add unit tests (recommended) for:
   - `pointInPolygon`
   - delivery fee calculations (threshold + surge edge cases)

## Notes on future enhancements (non-blocking)
- Replace placeholder polygons with real branch territories.
- Introduce Distance Matrix integration (driving ETA) behind an adapter interface in delivery service.
- Optional: migrate polygon storage to PostGIS if spatial indexing is needed at scale.

