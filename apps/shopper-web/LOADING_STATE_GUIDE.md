# Professional Loading State Implementation Guide

## Overview

This comprehensive loading state system provides a professional, accessible, and performant loading experience with the following features:

### ✅ Requirements Met

1. **Zero CLS Strategy** - Using `aspect-ratio` CSS in Skeleton components to match actual component dimensions exactly, preventing layout shifts when content loads
2. **Deterministic Readiness Hook** - Unified state combining Auth + Catalog + Critical Assets 
3. **Motion Physics** - Native-feel cubic-bezier easing `cubic-bezier(0.4, 0, 0.2, 1)` for smooth animations
4. **Smart Timeout (10s Guard)** - Intelligent timeout with Retry button and support message
5. **Accessibility Layer** - Full aria-busy and role="status" support for screen readers
6. **Graceful Show Delay (150ms)** - Prevents flashing on fast connections

## Architecture

```
LoadingOverlay (UI Component)
         ↓
LoadingOverlayContainer (Context Consumer)
         ↓
AppReadinessContext (State Management)
         ↓
useAppReadiness Hook (Business Logic)
         ↓
AppReadinessBridge (Auth + Catalog Integration)
```

## File Structure

```
src/
├── hooks/
│   └── useAppReadiness.ts           # Core readiness hook
├── contexts/
│   └── AppReadinessContext.tsx      # Context provider & hooks
├── components/
│   ├── LoadingOverlay.tsx           # Main UI component
│   ├── LoadingOverlay.module.css    # Overlay styling
│   ├── LoadingOverlayContainer.tsx  # Context wrapper
│   ├── AppReadinessBridge.tsx       # Auth/Catalog integration
│   ├── Skeleton.tsx                 # Skeleton components
│   └── Skeleton.module.css          # Skeleton styling
└── main.tsx                         # App initialization
```

## Usage Guide

### 1. Basic Setup (Already Done)

The system is automatically integrated in `main.tsx`:

```typescript
<AppReadinessProvider>
  <AppReadinessBridge />
  <LoadingOverlayContainer />
  <App />
</AppReadinessProvider>
```

### 2. Using Skeleton Components

For CLS prevention, replace loading placeholders with Skeleton components:

```typescript
import { 
  ProductCardSkeleton, 
  ProductGridSkeleton,
  Skeleton 
} from '@/components/Skeleton';

// Simple skeleton
<Skeleton variant="text" height={20} />

// Product grid skeleton
<ProductGridSkeleton count={6} />

// Custom aspect ratio
<Skeleton 
  variant="image" 
  aspectRatio={16/9} 
  width="100%"
/>
```

### 3. Skeleton Variants

- **text** - Line of text (height: 1rem)
- **card** - Card placeholder with padding
- **circle** - Round placeholder (use with equal width/height)
- **product** - Product image placeholder
- **image** - Generic image with aspect ratio support
- **button** - Button-sized placeholder

### 4. Pre-built Skeleton Components

```typescript
import {
  ProductCardSkeleton,      // Single product card
  ProductGridSkeleton,      // Grid of products
  CategoryCardSkeleton,     // Category card
  CartItemSkeleton,         // Shopping cart item
  HeaderSkeleton,           // Page header
  SearchBarSkeleton,        // Search input
  ListItemSkeleton,         // List items
  PageLayoutSkeleton        // Full page layout
} from '@/components/Skeleton';
```

### 5. Monitoring Readiness State

Access readiness state in any component:

```typescript
import { useAppReadinessContext } from '@/contexts/AppReadinessContext';

function MyComponent() {
  const { 
    isReady,           // Boolean: fully ready?
    isLoading,         // Boolean: currently loading?
    stage,             // LoadingStage enum
    progress,          // 0-100
    error,             // Error | null
    updateCatalogReady // Update functions
  } = useAppReadinessContext();

  return (
    <div>
      Loading: {progress}% - {stage}
    </div>
  );
}
```

### 6. Loading Stages

```typescript
enum LoadingStage {
  INITIAL = 'initial',
  AUTH_CHECKING = 'auth_checking',
  AUTH_COMPLETE = 'auth_complete',
  CATALOG_LOADING = 'catalog_loading',
  CATALOG_COMPLETE = 'catalog_complete',
  ASSETS_LOADING = 'assets_loading',
  ASSETS_COMPLETE = 'assets_complete',
  READY = 'ready',
  ERROR = 'error'
}
```

## Advanced Features

### Automatic Integration with Auth & Catalog

The `AppReadinessBridge` automatically:
- Updates auth status when authentication completes
- Updates catalog status when products/categories load
- Updates assets status after DOM is interactive

### Manual Readiness Updates

For custom loading scenarios:

```typescript
import { useReadinessUpdates } from '@/contexts/AppReadinessContext';

function CustomLoader() {
  const { 
    updateAuthReady, 
    updateCatalogReady, 
    updateAssetsReady 
  } = useReadinessUpdates();

  useEffect(() => {
    loadCustomAssets().then(() => {
      updateAssetsReady(true);
    });
  }, [updateAssetsReady]);

  return null;
}
```

### Retry Mechanism

Automatic retry on timeout (after 10 seconds):
- Max 3 retry attempts
- Support contact displayed
- Manual retry button available

## CSS Features

### Zero CLS with aspect-ratio

```css
/* Skeletons use aspect-ratio to prevent shifts */
.skeleton.image {
  aspect-ratio: 16 / 9;  /* Matches actual image */
  width: 100%;
  height: auto;
}
```

### Motion Physics

All transitions use native-feel easing:
```css
cubic-bezier(0.4, 0, 0.2, 1)  /* Native iOS feel */
```

### Accessibility

- `aria-busy="true"` during loading
- `role="status"` for screen reader announcements
- `aria-live="polite"` for dynamic updates
- High contrast support
- Reduced motion support

## Performance Optimizations

1. **150ms Show Delay** - Prevents loader flash on fast connections
2. **Will-change CSS** - Hardware acceleration for smooth animations
3. **Lazy Loading** - Skeletons only render when needed
4. **Timeout Guard** - Prevents infinite loading states

## Browser Support

- Modern browsers with CSS Grid/Flexbox
- CSS aspect-ratio support (fallback to padding-bottom for older browsers)
- Framer Motion animations
- Full accessibility support

## Customization

### Changing Colors

Edit `LoadingOverlay.module.css`:
```css
.spinner {
  border-top: 3px solid #YOUR_COLOR;
}

.progressBar {
  background: linear-gradient(90deg, #YOUR_COLOR ...);
}
```

### Adjusting Timeouts

In `useAppReadiness.ts`:
```typescript
const SHOW_DELAY_MS = 150;    // Time before showing overlay
const TIMEOUT_MS = 10000;     // Time before showing error
const MAX_RETRIES = 3;        // Max retry attempts
```

### Custom Skeleton Dimensions

```typescript
// Create custom skeleton matching your layout
<Skeleton 
  variant="image" 
  aspectRatio={4/3}     // Custom ratio
  width="300px"
/>
```

## Testing Checklist

- [ ] Overlay appears after 150ms on slow connections
- [ ] Overlay hides immediately when fully ready
- [ ] Progress bar reflects loading stages
- [ ] Retry button works after 10s timeout
- [ ] Skeleton shapes match final content dimensions
- [ ] No layout shifts when content loads
- [ ] Animations work smoothly (60fps)
- [ ] Dark mode looks correct
- [ ] Screen reader announces loading stages
- [ ] Works on mobile devices

## Troubleshooting

### Overlay Never Appears
- Check if AuthProvider and CatalogProvider are updated
- Verify AppReadinessBridge is mounted
- Check browser console for errors

### Overlay Stays Forever
- Check network requests in DevTools
- Verify 10s timeout triggers retry button
- Check if auth/catalog contexts are completing

### Layout Shifts Still Occurring
- Ensure all Skeletons have correct aspectRatio
- Check CSS width/height are explicit
- Verify no margin/padding changes on content load

### Animations Sluggish
- Enable hardware acceleration
- Check `will-change` CSS is present
- Reduce animation complexity on mobile

## Integration with Existing Code

The system automatically integrates with:
- AuthProvider (auth loading state)
- CatalogProvider (products/categories)
- React Router (navigation)
- Framer Motion (animations)
- Tailwind CSS (styling)

No breaking changes to existing code!
