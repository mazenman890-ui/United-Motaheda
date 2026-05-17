# Shopper Native — Architecture

Living reference for how this Expo Router + Supabase + Zustand + TanStack app is organized. Keep it short. Update when boundaries change.

---

## 1. Top-level layout

```
apps/shopper-native/
├── app/                        # Expo Router file-based routes (screens only)
├── src/
│   ├── features/               # Vertical feature slices
│   │   ├── auth/
│   │   ├── addresses/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── delivery/
│   │   ├── faq/
│   │   ├── notifications/
│   │   └── payment/
│   ├── shared/                 # Cross-feature reusable code
│   │   └── components/         # ErrorBoundary, generic UI primitives
│   ├── components/             # Legacy shared UI (CategoryCard, ProductCard, ui/*)
│   ├── stores/                 # Legacy stores being merged into features
│   ├── services/               # Legacy API wrappers being merged into features
│   ├── contexts/               # React contexts (Auth, etc.)
│   ├── hooks/                  # Shared hooks (useDebounce)
│   ├── lib/                    # Third-party clients (supabase)
│   ├── theme/                  # Design tokens (colors, fonts, shadows, spacing)
│   ├── types/                  # Shared types being merged into features
│   └── utils/                  # Pure helpers (format, storage)
└── supabase/
    └── migrations/             # Versioned SQL migrations
```

---

## 2. Feature ownership

Each feature is a self-contained vertical slice. All files for that domain live inside the feature folder.

| Feature | Responsibility |
|---|---|
| **auth** | Sign in, sign up, session management, AuthContext |
| **addresses** | Saved delivery addresses, CRUD UI, store |
| **cart** | Cart state, cart drawer UI, cart line management |
| **checkout** | Pricing engine, validation, payload builder, errors, order submission |
| **delivery** | Branches, geofencing, delivery quote, branch UI, maps |
| **faq** | FAQ data + accordion + category rail |
| **notifications** | Notification center, preferences, push tokens, realtime, banner |
| **payment** | Payment method types, store, selector UI |

---

## 3. Standard feature shape

```
src/features/<feature>/
├── index.ts               # Public barrel — ONLY thing other code imports
├── types.ts               # Domain types
├── store.ts               # Zustand store (when state is local to feature)
├── api.ts                 # Supabase / network calls (server state)
├── hooks/                 # Feature-specific hooks (TanStack Query, etc.)
├── components/            # Feature-local UI components
└── data.ts                # Seed / constant data (if applicable)
```

Not every feature has every file. Add only what's needed.

### Public exports rule

**Other features and screens MUST import from `@/features/<name>` (the barrel), never from internal files.**

```ts
// ✅ Correct
import { useCheckoutPricing, CheckoutRequestError } from "@/features/checkout";

// ❌ Wrong
import { CheckoutRequestError } from "@/features/checkout/errors";
```

This lets feature internals be refactored without touching consumers.

---

## 4. Store boundaries

- **Feature-local stores** live inside the feature (`features/cart/store.ts`).
- **Cross-feature stores** that genuinely need to be shared (rare) live in `src/stores/`.
- Stores expose **selectors** (e.g. `selectPricing`, `selectItemCount`) — components subscribe via selectors to minimize re-renders.
- Optimistic mutations with rollback on failure are the default pattern (see `useNotifications`, `useAddressStore`).

---

## 5. Shared vs feature-local components

| Lives in | When |
|---|---|
| `src/features/<name>/components/` | Used **only** by that feature |
| `src/shared/components/` | Reusable across **multiple** features, framework-agnostic (ErrorBoundary) |
| `src/components/` (legacy) | Generic catalog UI (ProductCard, CategoryCard) + `ui/` primitives (Button, Input, Badge) |
| `src/components/ui/` | Atomic, theme-driven UI atoms (Button, Input, Badge, Skeleton, EmptyState) |

If a component starts in a feature folder and later becomes shared, move it to `src/shared/components/` and re-export. **Don't share by import path traversal across feature folders.**

---

## 6. API layering rules

Three layers, top-to-bottom:

1. **Screen** (`app/*.tsx`) — composes hooks, renders UI, handles navigation
2. **Hook** (`features/*/hooks/*.ts`) — TanStack Query wrappers, optimistic state, derived data
3. **API service** (`features/*/api.ts`) — raw Supabase calls, error mapping, retry logic

Screens never call Supabase directly. Hooks never bypass the API layer.

### Server state vs client state

- **Server state** (orders, products, branches, notifications): **TanStack Query**. Cache, invalidation, optimistic updates.
- **Client state** (cart contents, selected payment method, form drafts): **Zustand**. Persistence via AsyncStorage.

---

## 7. Route compatibility contract

Routes are file paths in `app/`. **Do not rename existing route files** without coordinated profile-menu updates. Current routes:

```
/(tabs)/{index,products,search,cart,profile}
/(auth)/{login,register}
/addresses /checkout /faq /favorites /loyalty /notifications
/notification-preferences /onboarding /orders /payment /privacy /terms /about
/product/[id] /category/[id]
```

When adding a new route, also register it in `app/_layout.tsx` Stack.

---

## 8. Migration heuristics

When pulling a loose file into a feature folder:

1. Create the new file path inside the feature
2. Update the public barrel (`index.ts`) to export from the new path
3. **Search and replace** all consumers in one pass — `@/components/Foo` → `@/features/foo/components/Foo` (or `@/features/foo` if barrel-exported)
4. Delete the old file
5. Run `npx tsc -p tsconfig.check.json` (or equivalent) — must be clean before committing
6. Commit the migration as a single atomic change

Never leave the codebase half-migrated overnight — finish the feature in one session.

---

## 9. Production-readiness rules

- **All screens are wrapped by `ErrorBoundary`** (via `app/_layout.tsx` root). Per-screen boundaries optional.
- **All network calls go through a `try/catch` with a user-visible recovery path** (retry button, fallback data, or banner).
- **No `console.log` in production paths.** Use `if (__DEV__) console.warn(...)` for dev-only diagnostics.
- **Storage keys are namespaced** under `STORAGE_KEYS` in `src/utils/storage.ts` to avoid collisions.
- **Supabase RLS is enabled on every user-data table.** Migrations include policies.

---

## 10. Conventions

- TypeScript strict mode, no `any` unless escaping framework type bugs (RHF `Controller` is the only known exception)
- Arabic-first UI strings, English fallbacks in components that already accept `lang`
- RTL via `I18nManager.forceRTL(true)` set globally at app start
- Currency formatting via `formatPrice` in `src/utils/format.ts`
- Haptics via `expo-haptics` directly (not via a custom wrapper — kept inline for clarity)

---

Last updated: Phase 5b (feature folder migration).
