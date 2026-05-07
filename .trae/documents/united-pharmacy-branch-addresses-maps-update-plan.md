# United Pharmacy — Branch Addresses & Google Maps Embed Update Plan

## Summary
We will make the repository consistent with the **updated 5-branch dataset** by:
1) Updating the **single frontend source of truth** (`apps/shopper-web/src/app/data.ts`) with the new address strings and `mapEmbedSrc` URLs.  
2) Ensuring all UI pages use the `locations` array dynamically (no hardcoded addresses/IDs).  
3) Updating the backend seed (`apps/api/prisma/seed.ts`) to seed **exactly the same 5 branch IDs** (removing deprecated branches), including cleanup so old branches don’t remain in the database.  
4) Hardening “default branch” behavior (About/Contact/Checkout) so persisted or URL-provided branch IDs always fall back to a valid ID (preferably `gardenia` / primary).

---

## Current State Analysis (from repo inspection)

### Frontend (shopper-web)
- `apps/shopper-web/src/app/data.ts` already defines **exactly 5 branches** with these IDs:
  - `gardenia` (primary)
  - `maadi`
  - `nasr-city-hay-asher`
  - `zahraa-gomhoureya`
  - `zahraa-madinet-nasr`
- `mapEmbedSrc` is already stored as a **URL only** (not full `<iframe>` HTML), and the UI renders it via a typed `BranchMapEmbed` component:
  - `apps/shopper-web/src/app/components/BranchMapEmbed.tsx`
- Pages already reference `locations` dynamically:
  - `apps/shopper-web/src/app/pages/About.tsx`
  - `apps/shopper-web/src/app/pages/AboutMobile.tsx`
  - `apps/shopper-web/src/app/pages/Contact.tsx`
  - `apps/shopper-web/src/app/pages/Home.tsx`
  - `apps/shopper-web/src/app/pages/HomeMobile.tsx`
- `Contact.tsx` defaults to `branchesSorted[0]?.id ?? "gardenia"` (good).
- `About.tsx` / `AboutMobile.tsx` default to `locations[0]?.id ?? "gardenia"` (works today because `gardenia` is first, but fragile if ordering changes).
- `Checkout.tsx` renders the embed map (`BranchMapEmbed`) when `selectedBranch.mapEmbedSrc` exists; however, persisted `selectedBranchId` can become **stale** if it points to a removed branch ID.

### Backend (api seed) — **out of sync**
- `apps/api/prisma/seed.ts` seeds a different set of 5 branches and includes **deprecated IDs**:
  - Includes: `agouza`, `nasr-city-ahly` (deprecated per task examples)
  - Missing: `nasr-city-hay-asher`, `zahraa-gomhoureya`
- Seed uses `upsert`, so deprecated branches may remain in DB even after we change the list unless we add an explicit cleanup step.

---

## Updated 5-Branch Dataset (canonical)

Decision: **Store embed as URL only** (existing `mapEmbedSrc` approach) and render with `BranchMapEmbed.tsx`.  
Reason: Already implemented, typed, and avoids `dangerouslySetInnerHTML`.

Decision: To guarantee “100% consistency between the data source and UI components”, we will set **both** `addressAr` and `addressEn` to the exact dataset “Address” string for each branch (even if that string is English or mixed). This prevents Arabic/English drift across pages.

### 1) Gardenia City Branch
- ID: `gardenia`
- Address (use exactly): `كومباوند، مول جاردينيا سيتي وراك كومباوند, Cairo Governorate 11511`
- Embed src (use exactly, without backticks):  
  `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3452.31!2d31.3853!3d30.0827!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDA0JzU3LjciTiAzMcKwMjMnMDcuMSJF!5e0!3m2!1sen!2seg!4v1`

### 2) Maadi Branch
- ID: `maadi`
- Address: `1 Palestine Rd, El-Basatin Sharkeya, Maadi, Cairo Governorate 4234320`
- Embed src:  
  `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3454.8!2d31.2824!3d30.0146!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAwJzUyLjYiTiAzMcKwMTYnNTYuNiJF!5e0!3m2!1sen!2seg!4v1`

### 3) Al Hay Al Asher Branch
- ID: `nasr-city-hay-asher`
- Address: `29XR+3JR, Al Hay Al Asher, Nasr City, Cairo Governorate 4444137`
- Embed src:  
  `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.5!2d31.3533!3d30.0485!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAyJzU0LjYiTiAzMcKwMjEnMTEuOSJF!5e0!3m2!1sen!2seg!4v1`

### 4) Zahraa Nasr City - El Gomhoureya Branch
- ID: `zahraa-gomhoureya`
- Address: `فرع ش الجمهورية ع١٤ زهراء مدينة نصر`
- Embed src:  
  `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3452.9!2d31.3780!3d30.0650!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAzJzU0LjAiTiAzMcKwMjInNDAuOCJF!5e0!3m2!1sen!2seg!4v1`

### 5) Nasr City - Fatma El-Zahraa Branch
- ID: `zahraa-madinet-nasr`
- Address: `29WR+XHF, Fatma El-Zahraa Rd, Al Hay Al Asher, Nasr City, Cairo Governorate 4444134`
- Embed src:  
  `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.3!2d31.3550!3d30.0520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAzJzA3LjIiTiAzMcKwMjEnMTguMCJF!5e0!3m2!1sen!2seg!4v1`

---

## Proposed Changes (files + what/why/how)

### A) Frontend data source update (primary source of truth)
**File:** `apps/shopper-web/src/app/data.ts`

**What**
- Update each location entry:
  - `addressAr` and `addressEn` to the canonical “Address” string above
  - `mapEmbedSrc` to the canonical embed URL above
- Ensure `mapsDirectionsUrl`, `mapQuery`, `lat`, `lng` remain consistent with each other:
  - If `lat/lng` change, also update `buildBranchDirectionsUrl(lat,lng)` and `mapQuery`.

**Why**
- All pages display addresses from `locations`, so this enforces repository-wide consistency in the UI.

**How**
- For each of the 5 objects in `locations`, replace the address values and embed values.
- Keep IDs unchanged (they’re used by URL params and persisted state).

### B) UI map integration confirmation (no redesign)
**Files:**
- `apps/shopper-web/src/app/components/BranchMapEmbed.tsx`
- `apps/shopper-web/src/app/pages/Checkout.tsx` (uses `BranchMapEmbed`)

**What**
- No need to introduce `dangerouslySetInnerHTML`. Keep `mapEmbedSrc` as URL and render the `<iframe>` via `BranchMapEmbed`.

**Why**
- Current implementation is already typed and safe-by-default compared to raw HTML injection.

**How**
- Only adjust code if we discover any consumer incorrectly expects full `<iframe>` HTML (current grep shows it does not).

### C) Default/fallback branch IDs must always be valid

#### C1) About / AboutMobile default branch
**Files:**
- `apps/shopper-web/src/app/pages/About.tsx`
- `apps/shopper-web/src/app/pages/AboutMobile.tsx`

**What**
- Replace `locations[0]?.id` fallback logic with “primary-first” logic:
  - `const defaultBranchId = locations.find(l => l.isPrimary)?.id ?? locations[0]?.id ?? "gardenia";`
  - Then: `const selectedBranchId = searchParams.get("branch") ?? defaultBranchId;`
  - And ensure `selectedBranch` falls back to the primary location.

**Why**
- Prevents future ordering changes from breaking the “default to a valid branch (gardenia/primary)” requirement.

#### C2) Checkout stale persisted branch ID fix
**File:** `apps/shopper-web/src/app/pages/Checkout.tsx`

**What**
- Add a validation step after `deliveryBranches` is computed/available:
  - Determine `primaryDeliveryBranch = deliveryBranches.find(b => b.isPrimary) ?? deliveryBranches[0]`
  - If `selectedBranchId` is not found in `deliveryBranches`, set it to `primaryDeliveryBranch.id`
  - If `selectedArea` is empty/invalid, set it to `primaryDeliveryBranch.area`

**Why**
- If sessionStorage contains an old removed branch ID, it remains “non-empty” and will not be corrected unless we explicitly validate it.

**How**
- Implement as a `useEffect` dependent on `deliveryBranches` and the stored values.

### D) Global cleanup of deprecated branch IDs and hardcoded references
**Findings**
- Repo search shows deprecated IDs appear primarily in:
  - `apps/api/prisma/seed.ts` (`agouza`, `nasr-city-ahly`)

**Action**
- Remove deprecated branches from seed and add missing ones (see next section).
- Re-run a global grep during implementation to confirm there are no other occurrences.

### E) Backend seed alignment (ensure API + web match)
**File:** `apps/api/prisma/seed.ts`

**What**
1) Update `branches` array to contain **exactly** these IDs:
   - `gardenia`, `maadi`, `nasr-city-hay-asher`, `zahraa-gomhoureya`, `zahraa-madinet-nasr`
2) Update seeded fields to align with the frontend dataset where applicable:
   - `nameAr`, `nameEn`, `area`, `address`, `lat`, `lng`, `mapEmbedSrc`, `isActive`
3) Update `zoneByBranchId`:
   - Remove polygons for deprecated IDs.
   - Add polygons for new IDs if available; otherwise rely on the existing bbox fallback.
4) Add a cleanup step so the DB does not retain deprecated branches:
   - Delete branches **not** in the allow-list (or explicitly delete `agouza` and `nasr-city-ahly`).

**Why**
- The delivery quote backend (`apps/api/src/modules/delivery/delivery.service.ts`) reads active branches from DB.
- If DB contains branches not present in the frontend, UI and backend behavior diverge.

**How**
- Use `prisma.branch.deleteMany({ where: { id: { notIn: allowedIds }}})` after upserts (and/or delete zones similarly if needed, though FK cascade should handle it depending on schema).

---

## Assumptions & Decisions
- We will keep the existing embed integration pattern: `mapEmbedSrc` (URL only) + typed `<iframe>` component.
- We will treat the provided “Address” value as the canonical address string and apply it to both `addressAr` and `addressEn` for each branch to guarantee UI consistency.
- We will not introduce new branches or keep deprecated ones (Agouza/Heliopolis/Mokattam/etc.) anywhere in seed or UI.
- `gardenia` remains the **primary** location (`isPrimary: true`) and used as the default branch fallback.

---

## Verification Steps (post-implementation)

### Repository-wide checks
- Search for deprecated IDs/names and ensure **zero matches**:
  - `agouza`, `nasr-city-ahly`, `heliopolis`, `mokattam`, and any older addresses.
- Search for any hardcoded Google Maps `<iframe` usage and confirm branch maps come from `mapEmbedSrc` instead.

### Frontend runtime checks
- About page:
  - `/about` defaults to Gardenia (primary).
  - `/about?branch=<invalid>` falls back to Gardenia without errors.
- Contact page:
  - `/contact` defaults to Gardenia (already sorts by primary).
  - Addresses shown match the canonical dataset strings.
- Checkout:
  - With a stale `selectedBranchId` in sessionStorage, the UI corrects it to a valid branch and renders the correct map embed.
  - Confirm iframe renders and loads (no blank map due to malformed URL).

### Backend checks
- Run seed and confirm DB contains exactly 5 active branches with correct IDs.
- Delivery quote uses only valid branch IDs and returns a branch payload whose ID exists in the frontend list.

