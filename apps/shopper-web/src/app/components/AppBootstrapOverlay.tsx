import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { images } from "../data";

export default function AppBootstrapOverlay({
  active,
  title,
  subtitle,
  error,
  onRetry,
  minVisibleMs = 600,
  showDelayMs = 120,
}: {
  active: boolean;
  title?: string;
  subtitle?: string;
  error?: string | null;
  onRetry?: (() => void) | undefined;
  minVisibleMs?: number;
  showDelayMs?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (visible) {
        return;
      }
      if (showTimerRef.current) {
        return;
      }
      showTimerRef.current = window.setTimeout(() => {
        showTimerRef.current = null;
        setCanRender(true);
        setVisible(true);
        shownAtRef.current = Date.now();
      }, showDelayMs);
      return;
    }

    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (!visible) {
      setCanRender(false);
      return;
    }

    const shownAt = shownAtRef.current ?? Date.now();
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, minVisibleMs - elapsed);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setVisible(false);
    }, remaining);
  }, [active, minVisibleMs, showDelayMs, visible]);

  useEffect(() => {
    if (!visible) {
      const timer = window.setTimeout(() => setCanRender(false), 220);
      return () => window.clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!canRender) {
    return null;
  }

  const headline = title ?? "Preparing your experience";
  const description = subtitle ?? "Loading your account and product catalog…";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="bootstrap-overlay"
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-[100] overflow-hidden bg-[#041319] text-white"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.18),transparent_28%),linear-gradient(160deg,#06131a_0%,#0b1f29_48%,#102c38_100%)]" />

          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(45,212,191,0)_0%,rgba(45,212,191,0.45)_20%,rgba(56,189,248,0.42)_50%,rgba(45,212,191,0.45)_80%,rgba(45,212,191,0)_100%)] opacity-70" />

          <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
            <div className="w-full">
              <div className="mx-auto max-w-3xl rounded-[2.75rem] border border-white/12 bg-white/[0.06] p-6 shadow-[0_32px_100px_rgba(2,12,27,0.46)] backdrop-blur-xl md:p-9">
                <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-1 flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.8rem] border border-white/12 bg-white/10 shadow-[0_18px_46px_rgba(45,212,191,0.18)]">
                        <img src={images.logoMark} alt="United Pharmacies" className="h-8 w-8" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.26em] text-teal-100/90">
                          United Pharmacies
                        </p>
                        <p className="mt-2 text-2xl font-black leading-tight text-white md:text-3xl">
                          {headline}
                        </p>
                      </div>
                    </div>

                    <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-100/80 md:text-base">
                      {description}
                    </p>

                    {error ? (
                      <div className="rounded-[1.8rem] border border-rose-300/18 bg-rose-500/10 p-5">
                        <p className="text-sm font-black text-rose-100">Unable to load required data.</p>
                        <p className="mt-2 text-sm font-semibold text-rose-100/80">{error}</p>
                        {onRetry && (
                          <button
                            type="button"
                            onClick={onRetry}
                            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-900 shadow-[0_14px_36px_rgba(0,0,0,0.30)] transition-transform active:scale-[0.98]"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-4"
                          >
                            <div className="h-3 w-24 animate-pulse rounded-full bg-white/12" />
                            <div className="mt-4 h-7 w-28 animate-pulse rounded-full bg-teal-300/18" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-sm rounded-[2.2rem] border border-white/10 bg-slate-950/30 p-6">
                    <div className="h-3 w-28 animate-pulse rounded-full bg-white/14" />
                    <div className="mt-5 space-y-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 rounded-[1.6rem] border border-white/8 bg-white/[0.04] p-4"
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
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
