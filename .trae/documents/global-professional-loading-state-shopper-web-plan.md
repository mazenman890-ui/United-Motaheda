## Summary

Add a single, professional, app-wide loading system to `apps/shopper-web` that covers:
- Initial bootstrap (auth session/profile + initial catalog/products readiness + first route render)
- Route chunk loading (existing `Suspense` fallback) with upgraded skeleton architecture to reduce CLS
- Background refresh indication via a slim top progress bar (no full-screen blocking)

The result is a consistent “powerful” loading experience across every page in the shopper-web site (including `/`, `/products`, `/admin`, `/ops`, `/driver`, `/login`, etc.), driven by real app state (auth + catalog) with anti-flicker timing and smooth Framer Motion exit transitions.

## Current State Analysis (Grounded)

### Routing and current loader
- The app uses React Router + code-splitting with `lazy()` and a shared `withSuspense()` wrapper in [App.tsx](file:///i:/Pharmacy%20Motahheda%20(2)/United-Motaheda/United-Motaheda/apps/shopper-web/src/app/App.tsx#L1-L165).
- The current route-level loader is `RouteLoader()` (inline in `App.tsx`) and is used as the `Suspense` fallback for all lazy routes.

### Auth “account” loading
- Auth session restoration and profile fetching are owned by `AuthProvider`, exposing `loading` until Supabase `INITIAL_SESSION` is resolved in [AuthContext.tsx](file:///i:/Pharmacy%20Motahheda%20(2)/United-Motaheda/United-Motaheda/apps/shopper-web/src/context/AuthContext.tsx#L185-L345).
- Protected pages already block with a full-screen `AuthLoadingShell` in [ProtectedRoute.tsx](file:///i:/Pharmacy%20Motahheda%20(2)/United-Motaheda/United-Motaheda/apps/shopper-web/src/components/ProtectedRoute.tsx#L73-L98).

### Product/catalog loading
- Catalog is loaded in `CatalogProvider` via React Query with cached `initialSnapshot` and an `isLoading` flag designed to be true only when the catalog is empty and a fetch is happening in [CatalogContext.tsx](file:///i:/Pharmacy%20Motahheda%20(2)/United-Motaheda/United-Motaheda/apps/shopper-web/src/contexts/CatalogContext.tsx#L103-L170).

### Styling / UI primitives
- Tailwind is used extensively with “premium” gradients and glass effects in layout components (example: `AuthLoadingShell`, `layout.tsx`).
- A Skeleton primitive already exists in [skeleton.tsx](file:///i:/Pharmacy%20Motahheda%20(2)/United-Motaheda/United-Motaheda/apps/shopper-web/src/app/components/ui/skeleton.tsx#L1-L13).
- The app already uses Framer Motion in several places (example: `ProtectedRoute`).

## Proposed Changes (Decision-Complete)

### 1) Add a unified loading UI toolkit (new components)

**Files (new):**
- `apps/shopper-web/src/app/components/AppBootstrapOverlay.tsx`
- `apps/shopper-web/src/app/components/RouteLoadingSkeleton.tsx`
- `apps/shopper-web/src/app/components/TopProgressBar.tsx`

**What / Why / How:**
- **RouteLoadingSkeleton**
  - Replaces the inline `RouteLoader()` in `App.tsx`.
  - Uses a skeleton layout that matches the site structure (header hints + content blocks + card grid) to reduce layout shift (CLS).
  - Uses lightweight Tailwind/CSS-only skeletons (no heavy SVGs, no third-party loaders).
- **AppBootstrapOverlay**
  - Full-screen, branded overlay that appears only when required bootstrap data is missing.
  - Driven by “triple-check” readiness:
    - `authResolved`: `useAuth().loading === false`
    - `initialCatalogLoaded`: `useCatalog().products.length > 0` OR catalog errored (in which case show a retry UI)
    - `firstRouteReady`: internal `useEffect` marker to ensure the first route render is ready (prevents “flash of partially styled UI” on initial load)
  - Anti-flicker guard:
    - `showDelayMs` (e.g. 120ms) to avoid flashing loader for extremely fast loads
    - `minVisibleMs` (user request: 600ms) to keep the loader stable and “premium”
  - Smooth exit using Framer Motion (`opacity` + subtle `blur` on dismiss).
  - Provides an error state (only when catalog failed and is empty) with a “Retry” action calling `refreshCatalog(true)`.
- **TopProgressBar**
  - A very slim fixed bar at the top, indeterminate, used for non-blocking background fetching.
  - Driven by React Query `useIsFetching()` (only when bootstrap overlay is NOT showing) and optionally route navigation transitions (see section 3).
  - Uses CSS/Framer Motion only (no `nprogress` dependency).

### 2) Wire the global loader at the true root (covers every route)

**File (update):**
- `apps/shopper-web/src/app/App.tsx`

**What / Why / How:**
- Replace the inline `RouteLoader()` with `<RouteLoadingSkeleton />`.
- Render the new global loading layer(s) inside `BrowserRouter`, above `<Routes>` so they cover:
  - shopper routes under `<Layout />`
  - `/login`, `/register`
  - `/admin`, `/ops`, `/driver`, `/track/:orderId`
- Proposed rendering order inside `BrowserRouter`:
  - `<TopProgressBar />`
  - `<AppBootstrapOverlay />`
  - `<Routes>...</Routes>`
- Keep `withSuspense()` and route-level skeleton behavior intact (hybrid approach): the overlay is for bootstrap readiness, the skeleton is for route chunk loading.

### 3) Route transition signal (without migrating to React Router Data APIs)

**Constraint (grounded):**
- The app uses `BrowserRouter` + `Routes` (not `createBrowserRouter` / data loaders), so we won’t introduce Data Router loaders.

**Implementation (in `App.tsx` + TopProgressBar):**
- Track route changes using `useLocation()` and set a local `routeTransitionActive` for a short, guarded window:
  - Start when pathname/search changes
  - End after a small minimum duration (e.g. 250–350ms) OR immediately if the route is not code-split delayed (whichever fits better after implementation testing)
- Use that flag to optionally show the slim `TopProgressBar` during navigations.
- Do NOT show the full-screen overlay for normal navigations (only for missing bootstrap data), matching your “hybrid” preference.

### 4) Avoid duplicate full-screen blockers with ProtectedRoute

**Files (update):**
- `apps/shopper-web/src/components/ProtectedRoute.tsx`

**What / Why / How:**
- Keep `AuthLoadingShell` but prevent double-blocking when the global bootstrap overlay is already displayed.
- Approach:
  - Provide a small shared “bootstrap overlay visible” boolean through a tiny context owned by `AppBootstrapOverlay`, OR
  - Add a conservative rule: ProtectedRoute keeps working as-is, while AppBootstrapOverlay ignores `auth.loading` on protected routes (not recommended).
- Recommended: a small context from `App.tsx` so both `ProtectedRoute` and overlay can coordinate cleanly.

### 5) Keep performance tight

**Guidelines to enforce in implementation:**
- No large images or external libs for loading UI.
- Use Tailwind utility classes + minimal Framer Motion.
- Keep overlays portal-free (normal render) to avoid extra layout thrash.
- Ensure the overlay is not mounted/rendered when not needed (cheap boolean + delayed mount).

## Assumptions & Decisions

- Scope is `apps/shopper-web` only (user confirmed).
- Full-screen overlay appears only when required data is missing (user confirmed).
- Hybrid approach: route chunk loading uses skeleton fallback; bootstrap uses branded overlay; background work uses slim top progress (user confirmed).
- “Triple-check” readiness is implemented as:
  - Auth resolved: `useAuth().loading === false`
  - Initial catalog ready: `useCatalog().products.length > 0` OR show a catalog error UI with retry
  - First route render ready: internal marker set after initial mount + next animation frame
- Minimum visible duration for overlay: 600ms (user requested).

## Verification Steps

- Run the shopper web app and validate behavior manually:
  - Hard refresh on `/` and `/products`: full-screen overlay appears, then exits smoothly; product UI never renders with missing catalog.
  - Hard refresh on `/profile` (protected): you see exactly one full-screen experience (no “double loader”), then redirect/login works.
  - Navigate across routes quickly: route skeleton appears for lazy chunks; top progress bar appears briefly; no flicker.
  - Simulate slow network (DevTools): overlay remains stable (min 600ms), then exits; no CLS spikes from loader mismatch.
  - Force catalog failure (temporary bad API base): overlay shows error + retry, and retry successfully recovers when API works again.
