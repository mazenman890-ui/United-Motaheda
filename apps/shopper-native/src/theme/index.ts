/**
 * Legacy theme shim — kept so existing `import { theme } from "@/theme"`
 * imports across the codebase continue to work without modification.
 *
 * New code should import from "@/shared/theme":
 *   import { theme, colors, spacing } from "@/shared/theme";
 */

export * from "@/shared/theme";
