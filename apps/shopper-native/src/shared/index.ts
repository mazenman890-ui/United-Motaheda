/**
 * Top-level barrel for shared (cross-feature) code.
 *
 * Import paths:
 *   - Theme tokens:  "@/shared/theme"  (or granular submodules)
 *   - UI primitives: "@/shared/ui"
 *   - Components:    "@/shared/components"
 */

export * from "./theme";
export * from "./ui";
export { ErrorBoundary } from "./components";
