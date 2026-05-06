import { Suspense, lazy, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "./layout";
import { SearchProvider } from "../contexts/SearchContext";
import { ManagerAndAbove } from "./admin/AdminRouteProtection";

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
const Orders               = lazy(() => import("./pages/Orders")); // ← NEW
const ProductDetails       = lazy(() => import("./pages/ProductDetails"));
const Products             = lazy(() => import("./pages/Products"));
const Profile              = lazy(() => import("./pages/Profile"));
const Register             = lazy(() => import("./pages/Register"));
const Returns              = lazy(() => import("./pages/Returns"));
const SpecialOrders        = lazy(() => import("./pages/SpecialOrders"));
const SupportPage          = lazy(() => import("./pages/SupportPage"));

function RouteLoader() {
  return (
    <div className="min-h-[55vh] bg-[#F5FDFC]">
      <div className="page-section flex flex-col gap-6 py-10">
        <div className="h-4 w-28 animate-pulse rounded-full bg-teal-100" />
        <div className="space-y-3">
          <div className="h-12 max-w-3xl animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-4 max-w-2xl animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 max-w-xl animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-[2rem] border border-slate-200 bg-white shadow-sm"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
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
      </MotionConfig>
    </BrowserRouter>
  );
}