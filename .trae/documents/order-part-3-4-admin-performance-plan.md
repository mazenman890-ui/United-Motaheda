# Part 3–4 Plan: Admin Orders Completion and Shopper Performance Hardening

## Summary
This plan completes only the remaining scope for the United Pharmacies overhaul:

- Part 3: Admin and logistics management completion
- Part 4: Performance stabilization for lagging shopper flows

The current codebase already contains substantial work for Parts 1 and 2:

- shopper order caching and canonical order state in `apps/shopper-web/src/app/orders.ts`
- logistics-facing Supabase service contracts in `apps/shopper-web/src/services/logisticsApi.ts`
- shopper-facing order pages already upgraded in the prior plan phase
- major product-catalog performance work already present through:
  - worker-backed search
  - `react-virtuoso` virtualization
  - deferred updates
  - memoized product cards

This plan therefore does not restart the architecture. It finishes the admin layer professionally and removes the remaining sources of lag caused by ownership mismatches, duplicated query synchronization, inconsistent optimistic mutations, and page-level filtering paths that still bypass the worker-backed search engine.

## Current State Analysis
### Confirmed Architecture
- `apps/shopper-web/src/app/App.tsx` currently wraps the entire routed app with:
  - `BrowserRouter`
  - `SearchProvider`
  - `MotionConfig`
- `App.tsx` already exposes:
  - `/driver` protected for `driver`
  - `/ops` protected for `admin` and `manager`
  - `/admin/*` protected for `admin`, `manager`, and `pharmacist`
  - shopper pages inside `/`
- `apps/shopper-web/src/app/driver/DriverApp.tsx` already exists as the dedicated driver manifest and scan workspace.

### Admin Orders Layer Findings
- `apps/shopper-web/src/app/admin/OrdersManager.tsx` is partially modernized:
  - memoized rows/cards
  - debounced search
  - pagination
  - optimistic status update via `startTransition`
  - date filters
- However, it still conflicts with route ownership:
  - the component allows `driver`
  - `/admin` routing does not allow `driver`
- `apps/shopper-web/src/app/admin/OperationsHub.tsx` already acts as the richer delivery board for `admin` and `manager`.
- `OperationsHub.tsx` and `OrdersManager.tsx` currently do not share one mutation surface:
  - both use `googleSheetsApi.ts` for order reads/status writes
  - `OperationsHub.tsx` bypasses that adapter and imports `assignDriver` directly from `logisticsApi.ts`
- `OperationsHub.tsx` contains a rollback inconsistency:
  - on failed driver assignment it restores `assignedDriverId`
  - it does not restore `assignedDriver`

### Status Model Findings
- Canonical order lifecycle already exists in `apps/shopper-web/src/app/orders.ts`:
  - `pending`
  - `verified`
  - `packed`
  - `ready_for_dispatch`
  - `out_for_delivery`
  - `delivered`
  - `failed_delivery`
  - `returned`
  - `cancelled`
- Admin compatibility models in `apps/shopper-web/src/services/googleSheetsApi.ts` still collapse that into the older five-status UI model:
  - `Pending`
  - `Processing`
  - `Out for Delivery`
  - `Delivered`
  - `Cancelled`
- This means the admin UI is functional, but still one abstraction layer away from the canonical lifecycle.

### Special Orders Admin Findings
- `apps/shopper-web/src/app/admin/SpecialOrdersManager.tsx` already has:
  - loading/error states
  - missing-table detection
  - realtime subscription
  - debounced search
- It does not yet have parity with the stronger admin surfaces:
  - no role-aware shell decision inside the component
  - no status tabs
  - no date filtering
  - no shared action/filter language with `OrdersManager.tsx`

### Shopper Performance Findings
- `apps/shopper-web/src/contexts/SearchContext.tsx` already implements a strong search architecture:
  - split contexts to reduce rerenders
  - deferred input
  - worker-backed suggestions
  - prefetch cache
  - abort handling
  - route-based URL hydration
- `apps/shopper-web/src/app/hooks/useCatalogProductSearch.ts` already implements:
  - debounced query handling
  - worker-backed ranking
  - filter-aware worker requests
  - transition-based updates
  - deferred catalog use
- `apps/shopper-web/src/app/components/ProductGrid.tsx` already implements virtualized rendering via `react-virtuoso`.
- `apps/shopper-web/src/app/components/ProductCard.tsx` is already performance-tuned for virtualized grids.

### Remaining Lag Sources Confirmed in Code
- `apps/shopper-web/src/app/App.tsx` wraps the whole app in `SearchProvider`, including admin and driver routes that do not need shopper search state.
- `apps/shopper-web/src/app/pages/Products.tsx` duplicates URL synchronization already handled by `SearchContext.tsx`, creating avoidable route churn.
- `apps/shopper-web/src/app/pages/Offers.tsx` still performs its own local filter and sort pipeline instead of reusing `useCatalogProductSearch.ts`.
- `apps/shopper-web/src/app/pages/Categories.tsx` still performs page-local debounced category filtering instead of relying on precomputed searchable metadata.
- `apps/shopper-web/src/contexts/CatalogContext.tsx` computes several broad derived structures every snapshot:
  - categories
  - products-by-id map
  - categories-by-id map
  - in-stock products
  - spotlight products
  - metrics
- `apps/shopper-web/src/app/pages/ProductDetails.tsx` moved the alternative-products ranking off the critical render path, but still rebuilds a full lightweight descriptor pool from `products` on each product-details mount.

### External Research Used For Decisions
- React documentation confirms `startTransition` is the correct mechanism for keeping UI responsive during non-urgent rerenders, and that post-`await` state updates need to be wrapped again if they should remain transitional.
- React documentation for `useOptimistic` confirms optimistic state must stay tightly scoped and reconciled with authoritative server responses.
- Motion documentation confirms `MotionConfig reducedMotion="user"` and `useReducedMotion` are the correct global and local patterns for accessible motion behavior.
- React Virtuoso documentation confirms it is appropriate for large, variable-height virtualized grids, matching the current `ProductGrid.tsx` direction rather than requiring a redesign.

## Proposed Changes
### 1. Route and Role Ownership Cleanup
#### Files
- `apps/shopper-web/src/app/App.tsx`
- `apps/shopper-web/src/app/admin/OrdersManager.tsx`
- `apps/shopper-web/src/app/admin/AdminSidebar.tsx`
- `apps/shopper-web/src/app/admin/adminShared.tsx`

#### What
- Align route permissions and component behavior so that:
  - drivers use `/driver`
  - admin and manager use `/admin/orders` and `/admin/operations`
  - `OrdersManager.tsx` stops pretending to be both an admin list and a driver manifest
- Keep `DriverApp.tsx` as the only driver-optimized surface.

#### Why
- The codebase already has a dedicated driver experience.
- Leaving mixed role logic inside `OrdersManager.tsx` creates dead branches and confused UX.
- Strict route ownership is required before improving filters and optimistic mutations.

#### How
- Narrow `OrdersManager.tsx` to `admin | manager`.
- Remove driver-specific copy and behavior from `OrdersManager.tsx`.
- Ensure admin navigation does not present `/admin/orders` as a driver destination.
- Preserve `/driver` as the manifest-first workflow for drivers.

### 2. Unify Admin Order Data Access Behind One Adapter
#### Files
- `apps/shopper-web/src/services/logisticsApi.ts`
- `apps/shopper-web/src/services/googleSheetsApi.ts`
- `apps/shopper-web/src/app/admin/OrdersManager.tsx`
- `apps/shopper-web/src/app/admin/OperationsHub.tsx`

#### What
- Make `googleSheetsApi.ts` the single admin-facing compatibility adapter for:
  - listing admin orders
  - updating order status
  - assigning and unassigning drivers
- Keep `logisticsApi.ts` as the canonical lower-level logistics service.

#### Why
- `OperationsHub.tsx` currently mixes adapter-level and canonical-level mutations.
- This split makes cache invalidation and rollback logic inconsistent.
- A single adapter is required to keep all admin surfaces synchronized.

#### How
- Add an admin-compatible driver-assignment function to `googleSheetsApi.ts` that:
  - delegates to `logisticsApi.ts`
  - normalizes the returned canonical order back into `AdminOrder`
  - updates admin caches consistently
- Update `OperationsHub.tsx` to use the adapter instead of importing `assignDriver` directly from `logisticsApi.ts`.
- Keep canonical types and Supabase access in `logisticsApi.ts`.

### 3. Finish OrdersManager as the Operational List View
#### Files
- `apps/shopper-web/src/app/admin/OrdersManager.tsx`
- `apps/shopper-web/src/app/admin/adminShared.tsx`

#### What
- Upgrade `OrdersManager.tsx` into a stable macro-level operations list for admin and manager users.
- Add robust status tabs and cleaner date filtering without turning it into a duplicate of `OperationsHub.tsx`.

#### Why
- `OperationsHub.tsx` already serves assignment-heavy workflows.
- `OrdersManager.tsx` should become the broad, paginated list with excellent filtering and reliable bulk browsing.

#### How
- Keep current pagination and debounced search.
- Add status-based top tabs:
  - all
  - pending/in-progress
  - out for delivery
  - delivered
  - cancelled
- Replace freeform date filtering with a clearer model:
  - quick ranges
  - custom range mode
  - invalid-range guard
  - explicit active-filter summary
- Extract shared tab and filter-chip presentation from `adminShared.tsx`.
- Preserve bilingual labels and existing Tailwind + `cn()` patterns.

### 4. Harden Optimistic Mutations and Full Rollback
#### Files
- `apps/shopper-web/src/app/admin/OrdersManager.tsx`
- `apps/shopper-web/src/app/admin/OperationsHub.tsx`
- `apps/shopper-web/src/services/googleSheetsApi.ts`

#### What
- Replace single-field rollback logic with full-row optimistic reconciliation.

#### Why
- The current implementation can leave stale derived UI values after a failed mutation.
- Admin actions must feel instant but also remain authoritative and reversible.

#### How
- Replace singular `updatingId` semantics with per-row pending mutation state.
- Before optimistic write, snapshot the full previous row.
- On success:
  - replace the optimistic row with the normalized server-returned row
- On failure:
  - restore the full previous row
- Ensure driver assignment rollback restores both:
  - `assignedDriverId`
  - `assignedDriver`
- Prevent overlapping conflicting mutations on the same row while a mutation is in flight.

### 5. Finish SpecialOrdersManager With Admin-System Parity
#### Files
- `apps/shopper-web/src/app/admin/SpecialOrdersManager.tsx`
- `apps/shopper-web/src/app/admin/adminShared.tsx`

#### What
- Bring `SpecialOrdersManager.tsx` to the same UX and filter standard as the main admin order views.

#### Why
- It already has correct realtime and safety behavior.
- It still looks and behaves like a standalone queue rather than part of the rebuilt admin platform.

#### How
- Add explicit access handling aligned with admin routes.
- Add status tabs:
  - all
  - submitted
  - reviewing
  - fulfilled
  - cancelled
- Add date filtering consistent with `OrdersManager.tsx`.
- Preserve realtime subscription and missing-table detection.
- Keep the page read-only unless an existing backend mutation path for special-order status is verified during execution.

### 6. Scope SearchProvider to Shopper Routes Only
#### Files
- `apps/shopper-web/src/app/App.tsx`

#### What
- Move `SearchProvider` so it wraps only the shopper route tree.

#### Why
- Admin and driver routes do not require shopper search suggestions, worker initialization, or search-context rerender surfaces.
- Keeping `SearchProvider` global increases unnecessary app-wide state propagation.

#### How
- Remove top-level wrapping of all routes by `SearchProvider`.
- Wrap only the `/` shopper layout branch with `SearchProvider`.
- Preserve current shopper search behavior and public route behavior.

### 7. Make SearchContext the Single Source of Search URL Synchronization
#### Files
- `apps/shopper-web/src/contexts/SearchContext.tsx`
- `apps/shopper-web/src/app/pages/Products.tsx`
- `apps/shopper-web/src/app/pages/Categories.tsx`

#### What
- Eliminate duplicated search query ownership between `SearchContext.tsx` and page-level URL effects.

#### Why
- `Products.tsx` currently writes debounced search state back into URL params while `SearchContext.tsx` already reads and hydrates search state from the URL.
- This duplication is a likely source of lag during typing and navigation churn.

#### How
- Keep URL hydration in `SearchContext.tsx`.
- Remove the debounced write-back effect from `Products.tsx`.
- Use `committedQuery` for page-level result filtering and preserve raw `searchQuery` for immediate input/suggestions.
- Keep route-to-query restoration on browser navigation.

### 8. Reuse the Worker-Backed Search Engine for Offers
#### Files
- `apps/shopper-web/src/app/pages/Offers.tsx`
- `apps/shopper-web/src/app/hooks/useCatalogProductSearch.ts`
- `apps/shopper-web/src/app/components/ProductGrid.tsx`

#### What
- Replace `Offers.tsx` local filter/sort logic with the shared worker-backed search pipeline.

#### Why
- `Offers.tsx` is still doing manual `useMemo` filtering and sorting.
- The project already contains a better, more scalable product-search engine.

#### How
- Feed `featuredProducts` into `useCatalogProductSearch.ts`.
- Pass:
  - active category
  - search query
  - sort mode
- Use `ProductGrid` with its intended loading-state props:
  - `products`
  - `isSearching`
  - `activeQuery`
- Keep the existing offers-specific UI composition and bilingual copy.

### 9. Reduce Categories Search Cost With Precomputed Metadata
#### Files
- `apps/shopper-web/src/contexts/CatalogContext.tsx`
- `apps/shopper-web/src/app/hooks/useCatalogCategorySearch.ts`
- `apps/shopper-web/src/app/pages/Categories.tsx`

#### What
- Precompute searchable category metadata once per catalog snapshot and stop rebuilding comparable strings during page-level filtering.

#### Why
- Category search is not the heaviest flow, but it still performs redundant string assembly and filter work.
- Once higher-impact issues are fixed, this is a clean follow-up optimization with low product risk.

#### How
- Extend derived catalog state with category search text/index metadata.
- Keep `useCatalogCategorySearch.ts` as the category search entry point, but make it consume indexed metadata instead of recomputing equivalent fields.
- Preserve the existing `Categories.tsx` UI and zero-state behavior.

### 10. Consolidate Heavy Catalog-Derived State
#### Files
- `apps/shopper-web/src/contexts/CatalogContext.tsx`
- `apps/shopper-web/src/app/pages/Products.tsx`
- `apps/shopper-web/src/app/pages/Offers.tsx`
- `apps/shopper-web/src/app/pages/ProductDetails.tsx`

#### What
- Centralize expensive derived catalog structures so pages stop recomputing variations of the same data.

#### Why
- The catalog already has one large snapshot.
- The remaining lag is more likely to come from repeated derivative work than from raw fetch cost.

#### How
- Refactor `CatalogContext.tsx` to compute a single memoized derived snapshot containing:
  - `productsById`
  - `categoriesById`
  - `inStockProducts`
  - spotlight products
  - max price
  - ready-made counts used by shopper pages
  - recommendation descriptors for alternatives
- Expose only the structures actually needed by consumers.
- Keep the current public context API stable where possible; extend it rather than breaking all consumers at once.

### 11. Remove Alternative-Products Pool Rebuild From ProductDetails
#### Files
- `apps/shopper-web/src/contexts/CatalogContext.tsx`
- `apps/shopper-web/src/app/pages/ProductDetails.tsx`

#### What
- Precompute the lightweight recommendation descriptor pool once per catalog snapshot instead of rebuilding it inside `ProductDetails.tsx`.

#### Why
- The page is already improved because the computation moved out of render.
- The next bottleneck is repeated descriptor-pool creation on each details-page mount.

#### How
- Move descriptor generation into catalog-derived state.
- In `ProductDetails.tsx`, only:
  - read the current product
  - read the precomputed descriptor pool
  - rank alternatives
  - map ranked IDs back to the product map
- Preserve the current user-facing UI and keep the recommendation ranking deferred/non-blocking.

### 12. Make Existing ProductGrid Loading States Actually Active
#### Files
- `apps/shopper-web/src/app/pages/Products.tsx`
- `apps/shopper-web/src/app/pages/Offers.tsx`
- `apps/shopper-web/src/app/components/ProductGrid.tsx`

#### What
- Connect pages to the loading overlay and empty-state semantics already implemented in `ProductGrid.tsx`.

#### Why
- The grid component already contains initial-search, refinement-loading, and empty-result behavior.
- Some pages still render it as a plain product list, which leaves performance UX gains unused.

#### How
- Pass `isSearching` and `activeQuery` from the search hooks into `ProductGrid`.
- Preserve page-level hero, counters, and CTA layout.
- Keep load-more only where it remains a deliberate UX choice rather than a performance workaround.

## Assumptions & Decisions
### Confirmed Decisions
- Parts 1 and 2 are treated as already complete and are not re-planned here.
- `DriverApp.tsx` remains the driver-focused surface; driver workflows are not merged back into admin screens.
- `OperationsHub.tsx` remains the assignment-heavy board; `OrdersManager.tsx` remains the broad operational list.
- The current virtualization strategy with `react-virtuoso` is kept.
- The current worker-backed search strategy is kept and expanded, not replaced.
- Existing integrations, including Supabase functions and prior order-state work, must remain intact unless a clearly better compatible implementation is introduced during execution.

### Implementation Decisions
- No full migration of admin UI to canonical multi-step statuses is required in this phase unless execution reveals a minimal compatibility-safe path.
- The compatibility adapter in `googleSheetsApi.ts` will remain temporarily, but it must become internally consistent with `logisticsApi.ts`.
- Shopper search URL ownership will be centralized in `SearchContext.tsx`.
- Catalog-derived recommendation metadata will be moved into `CatalogContext.tsx` rather than recalculated per page.

### Intentional Non-Changes
- No Supabase schema migration is planned in this phase.
- No changes are planned to the shopper order pages covered in Part 2 except those indirectly affected by search-provider scoping or shared infrastructure.
- No removal of Framer Motion or motion polish is planned; only redundant or blocking work is reduced.
- No removal of current driver scanning/location flows is planned.

## Verification Steps
### Admin and Role Verification
1. Verify `/driver` remains accessible only to driver users.
2. Verify driver users can no longer enter `/admin/orders`.
3. Verify `/admin/orders` renders correctly for admin and manager users only.
4. Verify `/admin/operations` remains available to admin and manager only.
5. Verify admin navigation presents routes consistent with actual role ownership.

### OrdersManager Verification
1. Load `/admin/orders` with a populated order set:
   - search works
   - status tabs work
   - date filters work
   - pagination remains correct
2. Switch tabs and filters repeatedly:
   - page index stays valid
   - no empty-table glitch occurs incorrectly
3. Update order status successfully:
   - UI updates immediately
   - final row matches the authoritative returned state
4. Force a failed status update:
   - full row restores correctly
   - no stale label or status badge remains

### OperationsHub Verification
1. Assign a driver successfully:
   - both driver name and driver id update immediately
   - final row matches the returned server state
2. Force a failed driver assignment:
   - both `assignedDriverId` and `assignedDriver` revert correctly
3. Update delivery status successfully and unsuccessfully:
   - optimistic state behaves correctly
   - rollback is complete

### SpecialOrdersManager Verification
1. Verify realtime intake still loads and subscribes correctly.
2. Verify missing-table handling still shows the dedicated empty/error state.
3. Verify status tabs and date filters work together with search.
4. Verify the page remains stable under repeated realtime inserts and updates.

### Search and Routing Performance Verification
1. Type quickly in shopper search:
   - input remains responsive
   - URL does not churn on every intermediate keystroke
   - suggestions still update
2. Navigate away and back:
   - search state restores correctly from URL where expected
3. Confirm admin and driver routes no longer initialize shopper search behavior unnecessarily.

### Shopper Page Performance Verification
1. Open `/products` with a large catalog:
   - initial render is responsive
   - scrolling remains smooth
   - searching shows the intended `ProductGrid` loading UX
2. Open `/offers`:
   - filtering and searching use the shared search engine
   - no manual-filter lag remains
3. Open `/categories`:
   - category search remains instant and zero-state behavior still works
4. Open several product details pages in sequence:
   - no repeated heavy freeze occurs while computing alternatives

### Technical Verification
1. Run `npm run typecheck` in `apps/shopper-web`.
2. Run `npm run build` in `apps/shopper-web`.
3. Verify there are no TypeScript regressions from new adapter functions or context-shape extensions.
4. Verify route-level code splitting still works after provider scope changes.

## Execution Order
1. Route and role ownership cleanup
2. Admin adapter unification in `googleSheetsApi.ts` and `logisticsApi.ts`
3. OrdersManager filter/status-tab completion
4. Optimistic mutation hardening in OrdersManager and OperationsHub
5. SpecialOrdersManager parity upgrade
6. Scope `SearchProvider` to shopper-only routes
7. Remove duplicated search URL synchronization from `Products.tsx`
8. Reuse worker-backed search in `Offers.tsx`
9. Add precomputed category-search metadata
10. Consolidate heavy catalog-derived state
11. Remove alternative-pool rebuild from `ProductDetails.tsx`
12. Connect pages to `ProductGrid` loading-state props
