# Loading State Feature

Professional, accessible, and performant loading state system with zero layout shift (CLS).

## 📦 What's Included

- **useAppReadiness** - Core hook managing Auth → Catalog → Assets pipeline
- **AppReadinessContext** - Context provider for global state
- **LoadingOverlay** - Professional UI with progress tracking
- **LoadingOverlayContainer** - Pre-configured container component
- **AppReadinessBridge** - Automatic integration with Auth & Catalog
- **Skeleton Components** - CLS-preventing placeholder components

## 🚀 Quick Start

### 1. Setup in main.tsx

```typescript
import {
  AppReadinessProvider,
  LoadingOverlayContainer,
  AppReadinessBridge,
} from '@/features/loading-state';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppReadinessProvider>
    <AppReadinessBridge />
    <LoadingOverlayContainer />
    <App />
  </AppReadinessProvider>
);
```

### 2. Use Skeleton Components

```typescript
import { ProductGridSkeleton, Skeleton } from '@/features/loading-state';

// For product grid
<ProductGridSkeleton count={6} />

// For custom layouts
<Skeleton variant="image" aspectRatio={16/9} width="100%" />
```

### 3. Monitor Loading State

```typescript
import { useAppReadinessContext } from '@/features/loading-state';

function MyComponent() {
  const { isReady, progress, stage } = useAppReadinessContext();
  
  return <div>Progress: {progress}% - {stage}</div>;
}
```

## ✨ Features

- ✅ **Zero CLS** - aspect-ratio prevents layout shifts
- ✅ **Deterministic** - Auth + Catalog + Assets unified state
- ✅ **Smooth** - Native-feel cubic-bezier animations
- ✅ **Timeout Guard** - 10s timeout with retry mechanism
- ✅ **Accessible** - aria-busy, role="status", screen reader support
- ✅ **Show Delay** - 150ms graceful delay prevents flashing

## 📚 Documentation

See [LOADING_STATE_GUIDE.md](../../LOADING_STATE_GUIDE.md) for comprehensive documentation.

## 🎯 Loading Stages

```
INITIAL
  ↓
AUTH_CHECKING → AUTH_COMPLETE
  ↓
CATALOG_LOADING → CATALOG_COMPLETE
  ↓
ASSETS_LOADING → ASSETS_COMPLETE
  ↓
READY ✓
```

## 🛠️ File Structure

```
src/features/loading-state/
├── hooks/
│   └── useAppReadiness.ts
├── contexts/
│   └── AppReadinessContext.tsx
├── components/
│   ├── LoadingOverlay.tsx
│   ├── LoadingOverlay.module.css
│   ├── LoadingOverlayContainer.tsx
│   ├── AppReadinessBridge.tsx
│   ├── Skeleton.tsx
│   └── Skeleton.module.css
├── index.ts
└── README.md
```

## 💡 Integration Notes

- Automatically integrates with AuthProvider and CatalogProvider
- No breaking changes to existing code
- Can be used alongside existing loading states
- Dark mode and accessibility compliant

## 🔧 Customization

All colors, timeouts, and animations can be customized in the CSS and hook files.
