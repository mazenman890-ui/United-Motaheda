/**
 * Design system barrel.
 *
 * Single import path for the whole token system:
 *   import { theme } from "@/shared/theme";
 *
 * Granular imports also work via submodules:
 *   import { colors } from "@/shared/theme/colors";
 *   import { spacing } from "@/shared/theme/spacing";
 */

export * from "./tokens";

// Submodule re-exports for granular discoverability
export { colors } from "./colors";
export { typography, fonts, fontSize, fontWeight } from "./typography";
export { spacing } from "./spacing";
export { shadow } from "./shadows";
export { animation } from "./motion";
export { gradients, catGradients } from "./gradients";
export { radius } from "./radius";
export { layout, zIndex } from "./layout";
