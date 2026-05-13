/**
 * src/context/AuthContext.tsx — DEPRECATED backward-compat stub
 *
 * M11 structure consolidation: The canonical AuthContext implementation has
 * moved to `src/contexts/AuthContext.tsx` (note: plural `contexts/`).
 *
 * This file is a pure re-export kept only so that existing imports
 * (`../context/AuthContext` or `../../context/AuthContext`) continue to
 * resolve without touching every file at once.
 *
 * Migration path:
 *   - Update each import site to use `../contexts/AuthContext`
 *   - Once all references are updated, delete this file and the `context/`
 *     directory entirely.
 *
 * @deprecated Import from `../contexts/AuthContext` instead.
 */
export * from "../contexts/AuthContext";
