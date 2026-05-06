import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "../contexts/AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
  requireRole?: UserRole | UserRole[];
};

export function AuthLoadingShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05131a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.18),transparent_24%),linear-gradient(160deg,#06131a_0%,#0b1f29_48%,#102c38_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full rounded-[2.4rem] border border-white/12 bg-white/[0.06] p-6 shadow-[0_28px_90px_rgba(2,12,27,0.42)] backdrop-blur-xl md:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-teal-100">
                Secure Session
              </div>

              <div className="mt-6 space-y-4">
                <div className="h-4 w-36 animate-pulse rounded-full bg-white/14" />
                <div className="h-14 max-w-xl animate-pulse rounded-[1.8rem] bg-white/12" />
                <div className="h-4 max-w-lg animate-pulse rounded-full bg-white/10" />
                <div className="h-4 max-w-md animate-pulse rounded-full bg-white/10" />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {["Session", "Identity", "Route access"].map((label) => (
                  <div
                    key={label}
                    className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-4"
                  >
                    <div className="h-3 w-20 animate-pulse rounded-full bg-white/12" />
                    <div className="mt-4 h-7 w-24 animate-pulse rounded-full bg-teal-300/18" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/30 p-6">
              <div className="h-3 w-28 animate-pulse rounded-full bg-white/14" />
              <div className="mt-5 space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.04] p-4"
                  >
                    <div className="h-10 w-10 animate-pulse rounded-2xl bg-teal-300/18" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-28 animate-pulse rounded-full bg-white/12" />
                      <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingShell />;
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  const acceptedRoles = Array.isArray(requireRole)
    ? requireRole
    : requireRole
      ? [requireRole]
      : [];

  if (acceptedRoles.length && !acceptedRoles.includes(user.role)) {
    const redirectTo = user.role === "admin" || user.role === "manager" ? "/ops" : "/";
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}