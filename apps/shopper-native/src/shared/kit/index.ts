/**
 * @/shared/kit — the 2026 design language.
 *
 * New screens import { kit, Button, IconButton } from here and must not mix
 * in legacy gradient heroes / dark headers. See tokens.ts for the rules.
 */

export { kit } from "./tokens";
export type { Kit } from "./tokens";
export { Button, IconButton, MetaDot } from "./Button";
export type { ButtonProps, IconButtonProps, ButtonVariant, ButtonSize } from "./Button";
