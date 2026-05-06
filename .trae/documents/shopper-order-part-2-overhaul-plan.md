# Part 2 Plan: Shopper Order Experience Overhaul

## Summary
This plan covers **Part 2 only** of the order-management overhaul for `apps/shopper-web`: the shopper-facing experience in `Orders.tsx`, `OrderTracking.tsx`, and `SpecialOrders.tsx`, plus the minimal supporting shell/primitives/translation updates required to make those pages production-ready, bilingual, RTL-safe, motion-accessible, and fully aligned with the existing API/state work already completed in Part 1.

The implementation will **not** redesign or replace the current Supabase or Web3Forms data flows. Instead, it will consume the richer metadata that already exists in the current services and surface it through resilient, polished shopper UI states.

## Current State Analysis
### Architecture
- `apps/shopper-web/src/app/App.tsx` places:
  - `/orders` inside the protected shopper shell.
  - `/special-orders` inside the shopper shell.
  - `/track/:orderId` as a public route outside the shell.
- `apps/shopper-web/src/app/layout.tsx` provides the main shopper shell and route metadata.
- `apps/shopper-web/src/app/components/ShopperPrimitives.tsx` and `apps/shopper-web/src/app/components/BrandPrimitives.tsx` already contain reusable shopper-facing surfaces, hero blocks, and empty-state patterns that should be extended instead of duplicating bespoke UI.

### Orders Page
- `apps/shopper-web/src/app/pages/Orders.tsx` already has:
  - animated cards
  - status badges
  - loading skeletons
  - a basic empty state
  - refresh behavior
- It currently reads only the simple order array via `getCustomerOrders()` / `getCachedCustomerOrders()`.
- It does **not** consume the existing metadata from `getCustomerOrdersWithMeta()`:
  - `isOffline`
  - `isStale`
  - `cachedAt`
  - `hasQueuedMutations`
- It is visually solid but still lacks:
  - strong “continue shopping / browse categories / home” integration
  - explicit stale/offline/reconnecting states
  - shell-specific presentation
  - second-path CTAs to special orders

### Tracking Page
- `apps/shopper-web/src/app/pages/OrderTracking.tsx` already has:
  - polling
  - a timeline
  - a progress bar
  - map snapshot UI
  - manual refresh
- `apps/shopper-web/src/services/logisticsApi.ts` already returns `snapshot.connection.state` with:
  - `token_live`
  - `order_lookup_fallback`
  - `network_fallback`
- The page currently ignores that connection metadata and always presents itself as a live-tracking experience.
- The current implementation is largely English-only and does not yet distinguish:
  - true live tracking
  - degraded tracking after connection loss
  - status-only fallback
  - browser offline / reconnect states

### Special Orders Page
- `apps/shopper-web/src/app/pages/SpecialOrders.tsx` already has:
  - bilingual validation
  - shopper-shell variant
  - Web3Forms submission
  - success/error states
- It must preserve:
  - `VITE_WEB3FORMS_ACCESS_KEY`
  - POST to `https://api.web3forms.com/submit`
- The form UX is decent, but it is still isolated from the broader order journey and needs:
  - better post-submit follow-up navigation
  - stronger links back into shopping/orders
  - consistent CTA language and shopper-shell polish

### Accessibility / Motion Findings
- `Reveal.tsx` already appears to account for reduced motion patterns.
- `Orders.tsx` and `OrderTracking.tsx` still rely on multiple transform, ping, spin, and pulse effects.
- External references support:
  - using Motion’s `MotionConfig reducedMotion="user"` plus `useReducedMotion` for custom behavior
  - treating `navigator.onLine` and `window.online/offline` as **hints for UI state**, not as a perfect connectivity truth source

## Proposed Changes
### 1. `apps/shopper-web/src/app/App.tsx`
**What**
- Wrap the routed application tree in `MotionConfig` with reduced-motion support.

**Why**
- Orders and tracking rely heavily on Framer Motion and animated feedback.
- Accessibility and motion safety should be enforced consistently from the app root, not page by page.

**How**
- Import `MotionConfig` from `framer-motion`.
- Wrap the existing `<Routes>` tree with `<MotionConfig reducedMotion="user">`.
- Keep `/track/:orderId` public and outside `Layout`.
- Do not change route structure or authentication behavior.

### 2. `apps/shopper-web/src/app/components/ShopperPrimitives.tsx`
**What**
- Add reusable shopper-shell primitives for status banners and CTA clusters.

**Why**
- `Orders.tsx` and shell-mode `SpecialOrders.tsx` need the same patterns for:
  - offline
  - reconnecting
  - stale cache
  - success guidance
  - compact CTA rows
- Reusing primitives avoids page-specific duplication and keeps visual consistency with the mobile shell.

**How**
- Add a tone-based banner component for shell pages, with variants such as:
  - `info`
  - `warning`
  - `error`
  - `success`
  - `offline`
  - `reconnecting`
- Add a reusable CTA row / dock pattern for primary and secondary actions.
- Keep styling based on existing `cn()` usage and shopper-shell visual language.

### 3. `apps/shopper-web/src/app/components/BrandPrimitives.tsx`
**What**
- Extend desktop/public primitives for richer empty/error/offline surfaces used by `Orders.tsx` and `OrderTracking.tsx`.

**Why**
- Desktop orders and public tracking need stronger state presentation than the current one-off alert blocks.
- Shared primitives create a single visual system across:
  - empty results
  - invalid link
  - offline-no-cache
  - stale-but-visible data

**How**
- Extend or add reusable surfaces for:
  - blocking error states
  - degraded warning states
  - multi-CTA empty states
- Preserve current brand language and shadow/border styling already used in `PageHero`, `EmptyState`, and `ActionBand`.

### 4. `apps/shopper-web/src/app/pages/Orders.tsx`
**What**
- Upgrade the page from a simple order list into a metadata-aware shopper journey hub.

**Why**
- The service layer already supports offline and stale-cache awareness, but the UI is not using it.
- The page needs stronger navigation back into the storefront and clearer recovery states.

**How**
- Replace direct `getCustomerOrders()` usage with `getCustomerOrdersWithMeta()`.
- Keep `getCachedCustomerOrders()` only for fast first paint.
- Maintain local state for:
  - `orders`
  - `loading`
  - `refreshing`
  - `error`
  - `isOffline`
  - `isStale`
  - `cachedAt`
  - `hasQueuedMutations`
  - `isReconnecting`
- Add `window` listeners for `online` and `offline`:
  - on `offline`: keep cached orders visible and show offline banner
  - on `online`: show reconnecting state and force refresh
- Split UI into explicit states:
  - loading with no cache
  - fresh empty state
  - offline with cached orders
  - offline without cached orders
  - stale cached fallback after fetch failure
  - blocking error when nothing can be shown
  - queued-mutations notice
- Add highly visible CTA groupings:
  - browse products: `/products`
  - browse categories: `/categories`
  - go home: `/`
  - special orders: `/special-orders`
  - track live order: `/track/:orderId`
- Make CTA priority conditional:
  - if live order exists, primary CTA highlights tracking
  - otherwise primary CTA highlights shopping
- Add shopper-shell-specific rendering using `useIsShopperShell()`, `ShopperPage`, and `ShopperSurface`.
- Keep desktop layout but improve CTA banding and state hierarchy.
- Retain status cards and list separation between active and past orders.

### 5. `apps/shopper-web/src/app/pages/OrderTracking.tsx`
**What**
- Convert tracking from a single live-looking screen into a connection-aware, bilingual, state-accurate tracking experience.

**Why**
- The underlying API already distinguishes live token tracking from fallback modes, but the page does not.
- Current copy and indicators can be misleading when the connection degrades or live driver data is unavailable.

**How**
- Add `useLanguage()` and localize all user-facing copy.
- Use `snapshot.connection.state` to drive distinct visual modes:
  - `token_live`: full live-tracking presentation
  - `network_fallback`: degraded tracking with reconnect guidance
  - `order_lookup_fallback`: status-only mode with softened “live” language
- Track browser connectivity with `navigator.onLine` + `window.online/offline`.
- On offline:
  - preserve latest snapshot
  - pause live-looking indicators
  - label page as temporarily offline
- On reconnect:
  - show reconnecting indicator
  - force immediate refresh
- Update hero/status copy so it does not claim live visibility unless the connection state supports it.
- Refine timeline/progress UI:
  - keep visual polish
  - ensure statuses remain accurate for fallback modes
  - show clearer messaging for driver-not-yet-broadcasting and no-live-location cases
- Add recovery/navigation CTAs:
  - retry / reconnect
  - browse products
  - special orders
  - optionally “my orders” only where route context allows without introducing auth assumptions
- Keep polling behavior but avoid presenting stale data as live data.

### 6. `apps/shopper-web/src/app/pages/SpecialOrders.tsx`
**What**
- Keep the existing form transport but reposition the page as part of the order journey.

**Why**
- The page already works, but it does not yet connect naturally with the shopper’s order lifecycle.
- After a successful request, users need obvious next actions back into shopping or order review.

**How**
- Preserve:
  - environment key usage
  - Web3Forms POST endpoint
  - current validation rules
- Improve success-state follow-up UI with strong CTAs:
  - browse products
  - browse categories
  - go to orders
  - submit another request
- Align CTA visuals with the new order journey design used on `Orders.tsx`.
- Refine shell-mode presentation so the page feels native to shopper mobile flow, not just a standalone form.

### 7. `apps/shopper-web/src/app/components/ShopperMobileLayout.tsx`
**What**
- Treat order-focused routes as focused task pages with reduced shell chrome.

**Why**
- `/orders` and `/special-orders` are high-intent task pages.
- Full shell search/meta rails can make these routes feel visually stacked and distract from the task.

**How**
- Add focused-route handling for:
  - `/orders`
  - `/special-orders`
- For those routes, keep the shell frame but reduce or suppress duplicated header/search chrome.
- Do **not** move `/track/:orderId` into the shell.

### 8. `apps/shopper-web/src/i18n/translationData.ts`
**What**
- Add typed translation keys for new shopper-facing order states and CTA labels.

**Why**
- The current files still contain hardcoded English strings, especially in tracking.
- All new state-specific UX must be consistently bilingual.

**How**
- Add keys for:
  - viewing saved orders
  - last updated
  - offline with no saved orders
  - reconnect now
  - reconnecting
  - queued updates pending
  - request unavailable medicine
  - live tracking
  - status-only tracking
  - tracking connection lost
  - latest snapshot shown
  - invalid tracking link
  - browse products
  - browse categories
  - continue shopping
  - back to orders
- Replace hardcoded page strings with translation lookups where practical.

## Assumptions & Decisions
### Confirmed Decisions
- Part 1 is already finished; this plan only consumes existing Part 1 APIs/state rather than redesigning them.
- `shopperOrdersApi.ts`, `logisticsApi.ts`, and `app/orders.ts` remain functionally intact in Part 2.
- `SpecialOrders.tsx` must keep the current Web3Forms integration.
- `/track/:orderId` remains public and outside the main shell route tree.
- The implementation will keep using:
  - `cn()`
  - `lang === "ar"` branching where already established
  - current shopper-web route paths

### Implementation Assumptions
- The current application already has a valid `framer-motion` setup compatible with adding `MotionConfig`.
- Translation additions in `translationData.ts` are the preferred path for new reusable shopper copy.
- Shopper shell detection via `useIsShopperShell()` is the correct integration point for mobile-first order route presentation.

### Intentional Non-Changes
- No admin pages are changed in this phase.
- No Supabase schema, edge function, or order storage key changes are planned in this phase.
- No migration from Web3Forms to Supabase for special orders is planned in this phase.
- No movement of tracking into authenticated routes is planned.

## Verification Steps
### Functional Verification
1. Load `/orders` while online with existing orders:
   - active and past orders render correctly
   - live order CTA routes to `/track/:orderId`
2. Load `/orders` with no orders:
   - empty state shows
   - CTAs navigate to shopping/category/special-order routes
3. Simulate offline after cached orders exist:
   - cached orders remain visible
   - offline banner appears
   - reconnect action is available
4. Simulate offline with no cache:
   - dedicated offline-no-data state appears
5. Simulate fetch failure with cache:
   - stale-data banner appears
   - cached data remains usable
6. Load `/track/:orderId?token=...` in live mode:
   - page shows live-oriented copy and indicators only when `connection.state === "token_live"`
7. Simulate fallback tracking states:
   - `network_fallback` shows degraded banner and reconnect action
   - `order_lookup_fallback` shows status-only messaging
8. Submit special order form:
   - Web3Forms submission still succeeds
   - success state shows post-submit CTA group

### Localization / RTL Verification
1. Switch language to Arabic:
   - all new copy localizes correctly
   - arrow/icon direction mirrors correctly
   - IDs, phones, and timestamps remain readable with `dir="ltr"` where appropriate
2. Switch back to English:
   - no untranslated keys or mixed-language fragments remain

### Motion / Accessibility Verification
1. Enable reduced-motion at OS/browser level:
   - large transform-heavy transitions are reduced
   - decorative pings/spins/pulses no longer dominate the experience
   - meaning is preserved through text/icon changes
2. Ensure essential feedback remains visible without relying only on animation.

### Shell Integration Verification
1. Open `/orders` and `/special-orders` on mobile shell sizes:
   - page feels integrated with the shell
   - no duplicated task header + shell search/header clutter
2. Open `/track/:orderId` on mobile:
   - remains publicly accessible
   - layout remains usable without shell assumptions

### Technical Verification
1. Run shopper-web type checking:
   - `npm run typecheck` in `apps/shopper-web`
2. Run shopper-web build:
   - `npm run build` in `apps/shopper-web`
3. Manually verify there are no TypeScript regressions from translation or motion-config changes.

## Reference Notes
- Motion accessibility guidance supports using app-level reduced-motion configuration and component-level `useReducedMotion` for custom behavior.
- MDN guidance supports using `navigator.onLine` and `window.online/offline` as user-facing hints rather than a hard business-logic source of truth.
- React guidance supports transition-based non-blocking UI work; this is most relevant to later admin optimistic work, but in Part 2 it reinforces keeping reconnect and non-blocking refresh feedback responsive without misrepresenting data freshness.
