// Retired: zero importers across `src/`. The active suggestion path is the
// in-process worker pool (`app/hooks/catalogSearchWorker.ts` + `workers/fuzzySearch.worker.ts`),
// which serves suggestions from the same pre-built index used for the full
// product grid. Re-introduce remote suggestions only if/when there is a server
// endpoint for them. Safe to delete this file.
export {};
