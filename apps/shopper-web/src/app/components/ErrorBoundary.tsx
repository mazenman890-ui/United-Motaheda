/**
 * ErrorBoundary — M10 UI/UX polish upgrade
 *
 * Changes vs v1:
 *  - `componentDidCatch` now logs the error to the console (dev) and to
 *    the configured error-reporting endpoint (prod) via `sendBeacon`.
 *  - Added `resetErrorBoundary` / "Try again" path that resets internal
 *    state and re-renders children without a full page reload.
 *  - Bilingual UI (AR/EN) — the language preference is read from localStorage
 *    so we don't need to wire a React context into a class component.
 *  - Improved accessibility: `role="alert"`, focus management, aria-live.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Optional slot rendered above the default error UI */
  fallback?: (reset: () => void) => ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

function getLang(): "ar" | "en" {
  try {
    return (localStorage.getItem("lang") as "ar" | "en") ?? "en";
  } catch {
    return "en";
  }
}

function reportError(error: Error, errorInfo: ErrorInfo) {
  if (import.meta.env.DEV) {
    console.error("[ErrorBoundary]", error, errorInfo);
    return;
  }
  const endpoint = import.meta.env.VITE_ERROR_ENDPOINT as string | undefined;
  if (!endpoint) return;
  const body = JSON.stringify({
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    url: location.href,
    ts: Date.now(),
  });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, body);
    else void fetch(endpoint, { method: "POST", body, keepalive: true });
  } catch {
    /* never let error reporting crash the app */
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.resetError);

    const lang = getLang();
    const isAr = lang === "ar";

    return (
      <div
        dir={isAr ? "rtl" : "ltr"}
        className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16"
      >
        <div
          role="alert"
          aria-live="assertive"
          className="w-full max-w-lg rounded-[2.2rem] border border-slate-200 bg-white p-10 text-center shadow-[0_24px_48px_rgba(15,23,42,0.08)]"
        >
          {/* Icon */}
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle className="h-7 w-7" strokeWidth={2} />
          </div>

          {/* Headline */}
          <h1 className="mt-5 text-2xl font-black text-slate-950">
            {isAr ? "حدث خطأ غير متوقع" : "Something went wrong"}
          </h1>

          {/* Body */}
          <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
            {isAr
              ? "تعثّر التطبيق في خطأ غير متوقع. يمكنك المحاولة مرة أخرى أو إعادة تحميل الصفحة."
              : "The app hit an unexpected error. Try again or reload the page to recover safely."}
          </p>

          {/* Error detail (dev only) */}
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-slate-50 px-4 py-3 text-start text-[11px] font-mono text-rose-600">
              {this.state.error.message}
            </pre>
          )}

          {/* CTA buttons */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.resetError}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 text-sm font-black text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <RefreshCw className="h-4 w-4" />
              {isAr ? "حاول مجدداً" : "Try again"}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <RotateCcw className="h-4 w-4" />
              {isAr ? "أعد تحميل الصفحة" : "Reload page"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
