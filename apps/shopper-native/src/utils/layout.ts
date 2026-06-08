/**
 * layout.ts — RTL-aware layout utilities.
 *
 * All functions read `I18nManager.isRTL` which is set SYNCHRONOUSLY at boot
 * by the i18n init module (before any React render). This means the values
 * are stable for the lifetime of the app — no need for a reactive hook.
 *
 * Usage:
 *   import { flexRow, textAlignStart } from "@/utils/layout";
 *
 *   const s = StyleSheet.create({
 *     row: { flexDirection: flexRow() },   // "row-reverse" in AR, "row" in EN
 *   });
 *
 * Note: functions are called at StyleSheet.create time (module load), not per
 * render — values are frozen for the current language session. A language
 * switch triggers a full app reload (via Updates.reloadAsync), so the module
 * is re-evaluated with the new RTL flag on every language change.
 */

import { I18nManager, type TextStyle, type ViewStyle } from "react-native";

// ─── RTL flag ─────────────────────────────────────────────────────────────────
// Read once at import time — stable for the entire session.
const _isRTL = I18nManager.isRTL;

/** Returns true when the app is in RTL mode (Arabic). */
export function isRtl(): boolean {
  return _isRTL;
}

// ─── flexDirection ────────────────────────────────────────────────────────────

/**
 * RTL-aware flex row direction.
 * AR → "row-reverse"   (children flow right → left, logical start = right)
 * EN → "row"           (children flow left  → right, logical start = left)
 *
 * @param rtl  Override (defaults to app RTL flag). Pass false to force LTR.
 */
export function flexRow(rtl = _isRTL): ViewStyle["flexDirection"] {
  return rtl ? "row-reverse" : "row";
}

// ─── textAlign ────────────────────────────────────────────────────────────────

/**
 * Text alignment for the logical START of the current direction.
 * AR → "right"   EN → "left"
 */
export function textAlignStart(rtl = _isRTL): TextStyle["textAlign"] {
  return rtl ? "right" : "left";
}

/**
 * Text alignment for the logical END of the current direction.
 * AR → "left"   EN → "right"
 */
export function textAlignEnd(rtl = _isRTL): TextStyle["textAlign"] {
  return rtl ? "left" : "right";
}

// ─── Absolute edge helpers ────────────────────────────────────────────────────
// Use when you need to position an element at a physical edge but want it
// to map to the logical start/end instead.

/**
 * Physical edge key for the logical START of the current direction.
 * AR → "right"  (Arabic start = physical right)
 * EN → "left"   (English start = physical left)
 */
export function edgeStart(rtl = _isRTL): "left" | "right" {
  return rtl ? "right" : "left";
}

/**
 * Physical edge key for the logical END of the current direction.
 * AR → "left"   (Arabic end = physical left)
 * EN → "right"  (English end = physical right)
 */
export function edgeEnd(rtl = _isRTL): "left" | "right" {
  return rtl ? "left" : "right";
}

// ─── justifyContent helpers ───────────────────────────────────────────────────

/**
 * justifyContent value that pushes items toward the logical START.
 * Both "row" and "row-reverse" use "flex-start" for the start-aligned
 * direction — but the physical edge differs. Use with `flexRow()`.
 */
export const justifyStart = "flex-start" as const;

/**
 * justifyContent value for logical END alignment.
 */
export const justifyEnd   = "flex-end"   as const;
