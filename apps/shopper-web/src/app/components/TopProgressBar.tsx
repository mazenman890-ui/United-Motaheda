import { useIsFetching } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function TopProgressBar({
  navigationActive,
  disabled,
  showDelayMs = 120,
  minVisibleMs = 320,
}: {
  navigationActive: boolean;
  disabled: boolean;
  showDelayMs?: number;
  minVisibleMs?: number;
}) {
  const isFetching = useIsFetching() > 0;
  const active = !disabled && (navigationActive || isFetching);

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
      if (visible) return;
      if (showTimerRef.current) return;

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
      const timer = window.setTimeout(() => setCanRender(false), 200);
      return () => window.clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!canRender) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="top-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-x-0 top-0 z-[101] h-[3px] overflow-hidden bg-transparent"
          aria-hidden="true"
        >
          <motion.div
            className="h-full w-[38%] bg-[linear-gradient(90deg,rgba(45,212,191,0)_0%,rgba(45,212,191,0.95)_25%,rgba(56,189,248,0.9)_60%,rgba(45,212,191,0.95)_80%,rgba(45,212,191,0)_100%)]"
            initial={{ x: "-60%" }}
            animate={{ x: "220%" }}
            transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

