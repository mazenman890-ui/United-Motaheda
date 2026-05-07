import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { configureApiClient } from "@pharmacy/api-client";
import { getSharedQueryClient } from "@pharmacy/domain-core";
import { useBrowserLocation } from "@pharmacy/domain-location";
import "./i18n";
import App from "./app/App";
import { locations } from "./app/data";
import { publicEnv } from "./app/env";
import { AutoContrastTextGuard } from "./app/components/UI";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { CatalogProvider } from "./contexts/CatalogContext";
import { CartProvider } from "./contexts/CartContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AppReadinessProvider } from "./contexts/AppReadinessContext";
import { LoadingOverlayContainer } from "./components/LoadingOverlayContainer";
import { AppReadinessBridge } from "./components/AppReadinessBridge";
import { Toaster } from "./app/components/ui/sonner";
import "./styles/index.css";

configureApiClient({
  baseUrl: publicEnv.apiBase,
  searchApiBase: publicEnv.searchApiBase,
  defaultDeliveryFee: publicEnv.deliveryFee,
  branches: locations.map((location) => ({
    id: location.id,
    nameAr: location.fullNameAr,
    nameEn: location.fullNameEn,
    lat: location.lat,
    lng: location.lng,
    loadFactor: location.isPrimary ? 1 : 1.1,
  })),
});

function LocationBootstrap() {
  useBrowserLocation(true);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={getSharedQueryClient()}>
        <LanguageProvider>
          <AuthProvider>
            <FavoritesProvider>
              <CatalogProvider>
                <CartProvider>
                  <AppReadinessProvider>
                    <LocationBootstrap />
                    <AutoContrastTextGuard />
                    <AppReadinessBridge />
                    <LoadingOverlayContainer />
                    <App />
                    <Toaster richColors position="top-right" />
                  </AppReadinessProvider>
                </CartProvider>
              </CatalogProvider>
            </FavoritesProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
