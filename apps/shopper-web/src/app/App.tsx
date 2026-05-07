import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "./layout";
import { SearchProvider } from "../contexts/SearchContext";
import { ManagerAndAbove } from "./admin/AdminRouteProtection";
import { useAuth } from "../contexts/AuthContext";
import { useCatalog } from "../contexts/CatalogContext";
import AppBootstrapOverlay from "./components/AppBootstrapOverlay";
import { BootstrapBlockingProvider } from "./components/BootstrapBlockingContext";
import RouteLoadingSkeleton from "./components/RouteLoadingSkeleton";
import TopProgressBar from "./components/TopProgressBar";

const AdminLayout          = lazy(() => import("./admin/AdminLayout"));
const DriverApp            = lazy(() => import("./driver/DriverApp"));
const DashboardOverview    = lazy(() => import("./admin/DashboardOverview"));
const FastProductEntry     = lazy(() => import("./admin/FastProductEntry"));
const OperationsHub        = lazy(() => import("./admin/OperationsHub"));
const OrdersManager        = lazy(() => import("./admin/OrdersManager"));
const OrderTracking        = lazy(() => import("./pages/OrderTracking"));
const ProductManager       = lazy(() => import("./admin/ProductManager"));
const SpecialOrdersManager = lazy(() => import("./admin/SpecialOrdersManager"));
const StaffManager         = lazy(() => import("./admin/StaffManager"));
const About                = lazy(() => import("./pages/About"));
const Cart                 = lazy(() => import("./pages/Cart"));
const Categories           = lazy(() => import("./pages/Categories"));
const CategoryDetails      = lazy(() => import("./pages/CategoryDetails"));
const Checkout             = lazy(() => import("./pages/Checkout"));
const Contact              = lazy(() => import("./pages/Contact"));
const Favorites            = lazy(() => import("./pages/Favorites"));
const Home                 = lazy(() => import("./pages/Home"));
const Login                = lazy(() => import("./pages/Login"));
const Offers               = lazy(() => import("./pages/Offers"));
const Orders               = lazy(() => import("./pages/Orders"));
const ProductDetails       = lazy(() => import("./pages/ProductDetails"));
const Products             = lazy(() => import("./pages/Products"));
const Profile              = lazy(() => import("./pages/Profile"));
const Register             = lazy(() => import("./pages/Register"));
const Returns              = lazy(() => import("./pages/Returns"));
const SpecialOrders        = lazy(() => import("./pages/SpecialOrders"));
const SupportPage          = lazy(() => import("./pages/SupportPage"));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingSkeleton />}>{element}</Suspense>;
}

function AppShell() {
  const location = useLocation();
  const { loading: authLoading } = useAuth();
  const { products, error: catalogError, refreshCatalog } = useCatalog();

  const [firstRouteReady, setFirstRouteReady] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const navigationTimerRef = useRef<number | null>(null);
  const lastLocationRef = useRef<string>("");

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setFirstRouteReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    const key = `${location.pathname}?${location.search}`;

    if (!lastLocationRef.current) {
      lastLocationRef.current = key;
      return;
    }

    if (lastLocationRef.current === key) {
      return;
    }

    lastLocationRef.current = key;
    setNavigationActive(true);

    if (navigationTimerRef.current) {
      window.clearTimeout(navigationTimerRef.current);
    }

    navigationTimerRef.current = window.setTimeout(() => {
      navigationTimerRef.current = null;
      setNavigationActive(false);
    }, 350);

    return () => {
      if (navigationTimerRef.current) {
        window.clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
    };
  }, [location.pathname, location.search]);

  const pathname = location.pathname;
  const needsCatalog =
    !pathname.startsWith("/admin")
    && !pathname.startsWith("/ops")
    && !pathname.startsWith("/driver")
    && !pathname.startsWith("/login")
    && !pathname.startsWith("/register")
    && !pathname.startsWith("/track");

  const catalogBlocking = needsCatalog && products.length === 0;
  const blockingError = catalogBlocking ? catalogError : null;
  const isBlocking = !firstRouteReady || authLoading || catalogBlocking;

  return (
    <BootstrapBlockingProvider isBlocking={isBlocking}>
      <TopProgressBar navigationActive={navigationActive} disabled={isBlocking} />
      <AppBootstrapOverlay
        active={isBlocking}
        error={blockingError}
        onRetry={blockingError ? () => refreshCatalog(true) : undefined}
      />
      <Routes>
          {/* ── Auth ── */}
          <Route path="/login"    element={withSuspense(<Login />)} />
          <Route path="/register" element={withSuspense(<Register />)} />

          {/* ── Internal roles ── */}
          <Route
            path="/ops"
            element={withSuspense(
              <ProtectedRoute requireRole={["admin", "manager"]}>
                <OperationsHub />
              </ProtectedRoute>,
            )}
          />
          <Route
            path="/driver"
            element={withSuspense(
              <ProtectedRoute requireRole={["driver"]}>
                <DriverApp />
              </ProtectedRoute>,
            )}
          />

          {/* ── Public order tracking (linked from confirmation e-mails) ── */}
          <Route path="/track/:orderId" element={withSuspense(<OrderTracking />)} />

          {/* ── Admin ── */}
          <Route
            path="/admin"
            element={withSuspense(
              <ProtectedRoute requireRole={["admin", "manager", "pharmacist"]}>
                <AdminLayout />
              </ProtectedRoute>,
            )}
          >
            <Route index element={withSuspense(<DashboardOverview />)} />
            <Route path="orders"         element={withSuspense(<ManagerAndAbove><OrdersManager /></ManagerAndAbove>)} />
            <Route path="special-orders" element={withSuspense(<SpecialOrdersManager />)} />
            <Route path="products/fast-entry" element={withSuspense(<FastProductEntry />)} />
            <Route path="products"       element={withSuspense(<ProductManager />)} />
            <Route path="operations"    element={withSuspense(<ManagerAndAbove><OperationsHub /></ManagerAndAbove>)} />
            <Route path="staff"          element={withSuspense(<StaffManager />)} />
            <Route path="*"              element={<Navigate to="/admin" replace />} />
          </Route>

          {/* ── Shopper shell (main layout) — SearchProvider scoped here only ── */}
          <Route path="/" element={<SearchProvider><Layout /></SearchProvider>}>
            <Route index                         element={withSuspense(<Home />)} />
            <Route path="products"               element={withSuspense(<Products />)} />
            <Route path="products/:id"           element={withSuspense(<ProductDetails />)} />
            <Route path="categories"             element={withSuspense(<Categories />)} />
            <Route path="categories/:id"         element={withSuspense(<CategoryDetails />)} />
            <Route path="offers"                 element={withSuspense(<Offers />)} />
            <Route path="about"                  element={withSuspense(<About />)} />
            <Route path="contact"                element={withSuspense(<Contact />)} />
            <Route path="cart"                   element={withSuspense(<Cart />)} />
            <Route path="checkout"               element={withSuspense(<Checkout />)} />
            <Route path="shipping"               element={withSuspense(<SupportPage type="shipping" />)} />
            <Route path="returns"                element={withSuspense(<Returns />)} />
            <Route path="faq"                    element={withSuspense(<SupportPage type="faq" />)} />
            <Route path="terms"                  element={withSuspense(<SupportPage type="terms" />)} />
            <Route path="privacy"                element={withSuspense(<SupportPage type="privacy" />)} />
            <Route path="special-orders"         element={withSuspense(<SpecialOrders />)} />

            {/* Protected shopper routes */}
            <Route
              path="profile"
              element={withSuspense(
                <ProtectedRoute><Profile /></ProtectedRoute>,
              )}
            />
            <Route
              path="orders"
              element={withSuspense(
                <ProtectedRoute><Orders /></ProtectedRoute>,
              )}
            />
            <Route
              path="favorites"
              element={withSuspense(
                <ProtectedRoute><Favorites /></ProtectedRoute>,
              )}
            />
            <Route
              path="wishlist"
              element={withSuspense(
                <ProtectedRoute><Favorites /></ProtectedRoute>,
              )}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
    </BootstrapBlockingProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AppShell />
      </MotionConfig>
    </BrowserRouter>
  );
}
