import { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCatalog } from '../../../contexts/CatalogContext';
import { useReadinessUpdates } from '../contexts/AppReadinessContext';

/**
 * Bridge component that connects the new AppReadiness system
 * with existing Auth and Catalog contexts
 * 
 * This automatically updates the readiness state as auth and catalog load
 */
export function AppReadinessBridge() {
  const { loading: authLoading, user } = useAuth();
  const { products, categories, loading: catalogLoading } = useCatalog();
  const { updateAuthReady, updateCatalogReady, updateAssetsReady } = useReadinessUpdates();

  // Update auth readiness
  useEffect(() => {
    if (!authLoading) {
      updateAuthReady(true);
    }
  }, [authLoading, updateAuthReady]);

  // Update catalog readiness
  useEffect(() => {
    if (!catalogLoading && products.length > 0 && categories.length > 0) {
      updateCatalogReady(true);
    }
  }, [catalogLoading, products, categories, updateCatalogReady]);

  // Update assets readiness (simulated - in real app, track actual asset loading)
  useEffect(() => {
    // Assets are considered ready when:
    // 1. Auth is complete
    // 2. Catalog is loaded
    // 3. DOM is fully interactive
    if (authLoading === false && products.length > 0) {
      // Small delay to ensure DOM is fully painted
      const timer = setTimeout(() => {
        updateAssetsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading, products.length, updateAssetsReady]);

  return null;
}
