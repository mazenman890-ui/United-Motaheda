/**
 * motion.ts — M10 UI/UX Polish: Centralised animation token system
 *
 * All Framer Motion variants in the app should import from here.
 * This guarantees a consistent motion language regardless of which
 * component is animating — the four core duration classes and three
 * easing curves apply everywhere.
 *
 * ┌──────────────────────────────────────────────────────┐
 * │  Duration tokens                                     │
 * │  INSTANT  60ms   — state changes that feel immediate │
 * │  FAST    150ms   — micro-interactions, icon swaps    │
 * │  NORMAL  250ms   — most transitions                  │
 * │  SLOW    400ms   — page-level entrances              │
 * ├──────────────────────────────────────────────────────┤
 * │  Easing tokens (cubic-bezier)                        │
 * │  STANDARD     — general-purpose (ease-in-out feel)   │
 * │  DECELERATE   — elements entering the screen         │
 * │  ACCELERATE   — elements leaving the screen          │
 * └──────────────────────────────────────────────────────┘
 *
 * Usage:
 *   import { fadeIn, slideUp, DURATION } from "@/app/motion";
 *   <motion.div variants={fadeIn} initial="hidden" animate="visible" />
 */

import type { Variants, Transition } from "framer-motion";

// ─── Duration (seconds — Framer Motion uses seconds) ─────────────────────────

export const DURATION = {
  instant: 0.06,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

// ─── Easing curves ────────────────────────────────────────────────────────────

export const EASE = {
  /** General-purpose, balanced in/out */
  standard: [0.4, 0, 0.2, 1] as const,
  /** Enters the screen — starts fast, decelerates */
  decelerate: [0, 0, 0.2, 1] as const,
  /** Leaves the screen — starts slow, accelerates */
  accelerate: [0.4, 0, 1, 1] as const,
} as const;

// ─── Shared transition presets ────────────────────────────────────────────────

export const transition = {
  fast: { duration: DURATION.fast, ease: EASE.standard } satisfies Transition,
  normal: { duration: DURATION.normal, ease: EASE.standard } satisfies Transition,
  slow: { duration: DURATION.slow, ease: EASE.standard } satisfies Transition,
  enter: { duration: DURATION.normal, ease: EASE.decelerate } satisfies Transition,
  exit: { duration: DURATION.fast, ease: EASE.accelerate } satisfies Transition,
  spring: { type: "spring", stiffness: 400, damping: 30 } satisfies Transition,
  springGentle: { type: "spring", stiffness: 260, damping: 28 } satisfies Transition,
} as const;

// ─── Reusable variant presets ─────────────────────────────────────────────────

/** Simple opacity fade — use for modals, toasts, overlays */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.normal },
  exit: { opacity: 0, transition: transition.exit },
};

/** Slide up + fade — use for bottom sheets, cards entering from below */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transition.enter },
  exit: { opacity: 0, y: 8, transition: transition.exit },
};

/** Slide down + fade — use for dropdowns, popovers */
export const slideDown: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: transition.enter },
  exit: { opacity: 0, y: -4, transition: transition.exit },
};

/** Scale in from 95% — use for dialog / modal entrances */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transition.enter },
  exit: { opacity: 0, scale: 0.97, transition: transition.exit },
};

/** Stagger container — apply to a list wrapper; children stagger by 0.05s */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

/** Stagger child — apply to each list item inside a staggerContainer */
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transition.enter },
};

/** Horizontal slide for tab panels / carousels */
export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: transition.enter },
  exit: { opacity: 0, x: -12, transition: transition.exit },
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: transition.enter },
  exit: { opacity: 0, x: 12, transition: transition.exit },
};

// ─── MotionConfig defaults (already set in App.tsx) ───────────────────────────
// App.tsx uses <MotionConfig reducedMotion="user"> which automatically disables
// all animations when the OS prefers reduced motion. No per-component handling
// is required — just use these variants and they'll be motion-safe automatically.
