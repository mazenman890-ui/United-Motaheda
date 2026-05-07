import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Loading stages with hierarchical readiness
 * Stage progression: Auth → Catalog → Assets → Ready
 */
export enum LoadingStage {
  INITIAL = 'initial',
  AUTH_CHECKING = 'auth_checking',
  AUTH_COMPLETE = 'auth_complete',
  CATALOG_LOADING = 'catalog_loading',
  CATALOG_COMPLETE = 'catalog_complete',
  ASSETS_LOADING = 'assets_loading',
  ASSETS_COMPLETE = 'assets_complete',
  READY = 'ready',
  ERROR = 'error',
}

export interface AppReadinessState {
  isReady: boolean;
  isLoading: boolean;
  stage: LoadingStage;
  error: Error | null;
  retryCount: number;
  shouldShowOverlay: boolean;
  progress: number; // 0-100
  authReady: boolean;
  catalogReady: boolean;
  assetsReady: boolean;
}

interface ReadinessChecks {
  authReady: boolean;
  catalogReady: boolean;
  assetsReady: boolean;
}

const SHOW_DELAY_MS = 150; // Don't show loader for fast loads
const TIMEOUT_MS = 10000; // 10 second timeout
const MAX_RETRIES = 3;

/**
 * Unified deterministic readiness hook
 * Manages Auth → Catalog → Assets loading states
 * Guarantees overlay only shows when necessary & disappears only when fully ready
 */
export function useAppReadiness() {
  const [state, setState] = useState<AppReadinessState>({
    isReady: false,
    isLoading: true,
    stage: LoadingStage.INITIAL,
    error: null,
    retryCount: 0,
    shouldShowOverlay: false,
    progress: 0,
    authReady: false,
    catalogReady: false,
    assetsReady: false,
  });

  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const showDelayIdRef = useRef<NodeJS.Timeout | null>(null);
  const checksRef = useRef<ReadinessChecks>({
    authReady: false,
    catalogReady: false,
    assetsReady: false,
  });

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (showDelayIdRef.current) clearTimeout(showDelayIdRef.current);
    };
  }, []);

  /**
   * Update individual readiness checks
   */
  const updateAuthReady = useCallback((ready: boolean) => {
    checksRef.current.authReady = ready;
    updateState();
  }, []);

  const updateCatalogReady = useCallback((ready: boolean) => {
    checksRef.current.catalogReady = ready;
    updateState();
  }, []);

  const updateAssetsReady = useCallback((ready: boolean) => {
    checksRef.current.assetsReady = ready;
    updateState();
  }, []);

  /**
   * Determine current stage based on completed checks
   */
  const determineStage = useCallback((): LoadingStage => {
    const { authReady, catalogReady, assetsReady } = checksRef.current;

    if (authReady && catalogReady && assetsReady) return LoadingStage.ASSETS_COMPLETE;
    if (authReady && catalogReady) return LoadingStage.CATALOG_COMPLETE;
    if (authReady) return LoadingStage.AUTH_COMPLETE;
    
    return LoadingStage.AUTH_CHECKING;
  }, []);

  /**
   * Calculate progress percentage
   */
  const calculateProgress = useCallback((): number => {
    const { authReady, catalogReady, assetsReady } = checksRef.current;
    let progress = 0;

    if (authReady) progress += 33;
    if (catalogReady) progress += 33;
    if (assetsReady) progress += 34;

    return Math.min(100, progress);
  }, []);

  /**
   * Core state update logic
   */
  const updateState = useCallback(() => {
    const { authReady, catalogReady, assetsReady } = checksRef.current;
    const allReady = authReady && catalogReady && assetsReady;
    const stage = determineStage();
    const progress = calculateProgress();

    setState((prevState) => {
      const newState: AppReadinessState = {
        ...prevState,
        stage,
        progress,
        isReady: allReady,
        isLoading: !allReady,
        authReady,
        catalogReady,
        assetsReady,
      };

      // Only update shouldShowOverlay after SHOW_DELAY_MS
      // This prevents flickering on fast connections
      if (newState.isLoading && !prevState.shouldShowOverlay) {
        if (showDelayIdRef.current) clearTimeout(showDelayIdRef.current);
        showDelayIdRef.current = setTimeout(() => {
          setState((s) => ({ ...s, shouldShowOverlay: true }));
        }, SHOW_DELAY_MS);
      } else if (!newState.isLoading) {
        // Immediately hide overlay when ready
        if (showDelayIdRef.current) clearTimeout(showDelayIdRef.current);
        newState.shouldShowOverlay = false;
      }

      return newState;
    });
  }, [determineStage, calculateProgress]);

  /**
   * Handle loading timeout - show retry button after 10s
   */
  const handleTimeout = useCallback(() => {
    const { authReady, catalogReady, assetsReady } = checksRef.current;
    
    if (!authReady || !catalogReady || !assetsReady) {
      setState((prev) => ({
        ...prev,
        stage: LoadingStage.ERROR,
        error: new Error('Loading timeout after 10 seconds'),
        shouldShowOverlay: true,
      }));
    }
  }, []);

  /**
   * Start timeout guard
   */
  const startTimeoutGuard = useCallback(() => {
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = setTimeout(handleTimeout, TIMEOUT_MS);
  }, [handleTimeout]);

  /**
   * Reset timeout when progress is made
   */
  const resetTimeout = useCallback(() => {
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    startTimeoutGuard();
  }, [startTimeoutGuard]);

  /**
   * Retry loading after error
   */
  const retry = useCallback(() => {
    if (state.retryCount >= MAX_RETRIES) {
      setState((prev) => ({
        ...prev,
        error: new Error('Maximum retries exceeded'),
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      error: null,
      stage: LoadingStage.AUTH_CHECKING,
      shouldShowOverlay: true,
      authReady: false,
      catalogReady: false,
      assetsReady: false,
    }));

    // Reset checks
    checksRef.current = {
      authReady: false,
      catalogReady: false,
      assetsReady: false,
    };

    resetTimeout();
  }, [state.retryCount, resetTimeout]);

  // Start timeout guard on mount
  useEffect(() => {
    startTimeoutGuard();
    updateState();
  }, [startTimeoutGuard, updateState]);

  // Reset timeout whenever a check is updated
  useEffect(() => {
    resetTimeout();
  }, [resetTimeout]);

  return {
    // State
    ...state,

    // Callbacks
    updateAuthReady,
    updateCatalogReady,
    updateAssetsReady,
    retry,

    // Helper methods
    isAuthReady: () => checksRef.current.authReady,
    isCatalogReady: () => checksRef.current.catalogReady,
    isAssetsReady: () => checksRef.current.assetsReady,
    allReady: () => checksRef.current.authReady && checksRef.current.catalogReady && checksRef.current.assetsReady,
  };
}
