import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCatalog } from '../contexts/CatalogContext';
import { useReadinessUpdates } from '../contexts/AppReadinessContext';

/**
 * Bridges AuthContext + CatalogContext into AppReadinessContext.
 *
 * Readiness gates:
 *   - auth     → fires once `authLoading` is false (regardless of user presence).
 *   - catalog  → fires once both `products` and `categories` are non-empty
 *                AND the catalog provider is no longer marked `isLoading`.
 *                The latter check ensures we don't flip `catalogReady` based
 *                purely on seed data restored from localStorage while the live
 *                snapshot is still mid-fetch.
 *   - assets   → currently piggybacks on `auth + catalog` plus a 100ms paint
 *                delay. There is no real asset-tracking signal yet; this is
 *                a conservative best-effort that's better than the old gate,
 *                which fired on cached seed alone.
 *
 * NOTE: the previous version destructured `loading` from `useCatalog()`. The
 * context exposes `isLoading`, never `loading`, so the local was always
 * `undefined` and the gate effectively used `!undefined === true` — i.e. it
 * skipped the loading check entirely. Fixed.
 */
export function AppReadinessBridge() {
  const { loading: authLoading } = useAuth();
  const { products, categories, isLoading: catalogLoading } = useCatalog();
  const { updateAuthReady, updateCatalogReady, updateAssetsReady } = useReadinessUpdates();

  // Auth ready as soon as the auth bootstrap finishes (signed-in or not).
  useEffect(() => {
    if (!authLoading) {
      updateAuthReady(true);
    }
  }, [authLoading, updateAuthReady]);

  // Catalog ready once the live snapshot resolves AND we have data.
  useEffect(() => {
    if (!catalogLoading && products.length > 0 && categories.length > 0) {
      updateCatalogReady(true);
    }
  }, [catalogLoading, products.length, categories.length, updateCatalogReady]);

  // Assets ready ≈ auth+catalog resolved + brief paint window.
  useEffect(() => {
    if (authLoading) return;
    if (catalogLoading) return;
    if (products.length === 0 || categories.length === 0) return;

    const timer = setTimeout(() => {
      updateAssetsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [
    authLoading,
    catalogLoading,
    products.length,
    categories.length,
    updateAssetsReady,
  ]);

  return null;
}
