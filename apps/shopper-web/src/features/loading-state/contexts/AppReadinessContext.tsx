import { ReactNode, createContext, useContext } from 'react';
import {
  AppReadinessState,
  LoadingStage,
  useAppReadiness,
} from '../hooks/useAppReadiness';

interface AppReadinessContextType extends Omit<AppReadinessState, 'shouldShowOverlay'> {
  updateAuthReady: (ready: boolean) => void;
  updateCatalogReady: (ready: boolean) => void;
  updateAssetsReady: (ready: boolean) => void;
  retry: () => void;
  isAuthReady: () => boolean;
  isCatalogReady: () => boolean;
  isAssetsReady: () => boolean;
  allReady: () => boolean;
  shouldShowOverlay: boolean;
}

const AppReadinessContext = createContext<AppReadinessContextType | undefined>(undefined);

interface AppReadinessProviderProps {
  children: ReactNode;
}

/**
 * Provider for unified app readiness state
 * Manages Auth → Catalog → Assets loading pipeline
 */
export function AppReadinessProvider({ children }: AppReadinessProviderProps) {
  const readiness = useAppReadiness();

  const contextValue: AppReadinessContextType = {
    isReady: readiness.isReady,
    isLoading: readiness.isLoading,
    stage: readiness.stage,
    error: readiness.error,
    retryCount: readiness.retryCount,
    progress: readiness.progress,
    authReady: readiness.authReady,
    catalogReady: readiness.catalogReady,
    assetsReady: readiness.assetsReady,
    shouldShowOverlay: readiness.shouldShowOverlay,
    updateAuthReady: readiness.updateAuthReady,
    updateCatalogReady: readiness.updateCatalogReady,
    updateAssetsReady: readiness.updateAssetsReady,
    retry: readiness.retry,
    isAuthReady: readiness.isAuthReady,
    isCatalogReady: readiness.isCatalogReady,
    isAssetsReady: readiness.isAssetsReady,
    allReady: readiness.allReady,
  };

  return (
    <AppReadinessContext.Provider value={contextValue}>
      {children}
    </AppReadinessContext.Provider>
  );
}

/**
 * Hook to access app readiness context
 * @throws {Error} if used outside AppReadinessProvider
 */
export function useAppReadinessContext(): AppReadinessContextType {
  const context = useContext(AppReadinessContext);
  if (!context) {
    throw new Error(
      'useAppReadinessContext must be used within AppReadinessProvider'
    );
  }
  return context;
}

/**
 * Helper hook for simpler access to just the readiness state
 */
export function useReadinessState() {
  const context = useAppReadinessContext();
  return {
    isReady: context.isReady,
    isLoading: context.isLoading,
    stage: context.stage,
    error: context.error,
    progress: context.progress,
    authReady: context.authReady,
    catalogReady: context.catalogReady,
    assetsReady: context.assetsReady,
  };
}

/**
 * Helper hook for simpler access to just the update functions
 */
export function useReadinessUpdates() {
  const context = useAppReadinessContext();
  return {
    updateAuthReady: context.updateAuthReady,
    updateCatalogReady: context.updateCatalogReady,
    updateAssetsReady: context.updateAssetsReady,
    retry: context.retry,
  };
}
