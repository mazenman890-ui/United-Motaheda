import { LoadingOverlay } from './LoadingOverlay';
import { useAppReadinessContext } from '../contexts/AppReadinessContext';

/**
 * Container component that renders the LoadingOverlay
 * Connected to AppReadiness context for full loading state management
 * 
 * Features:
 * - Zero CLS with aspect-ratio skeletons (separate component)
 * - Deterministic readiness combining Auth + Catalog + Assets
 * - Smooth transitions with native-feel cubic-bezier easing
 * - 10-second timeout with retry mechanism
 * - Full accessibility support (aria-busy, role="status")
 * - 150ms show delay to prevent flash on fast connections
 */
export function LoadingOverlayContainer() {
  const readinessState = useAppReadinessContext();

  return (
    <LoadingOverlay
      readinessState={readinessState}
      onRetry={readinessState.retry}
    />
  );
}
