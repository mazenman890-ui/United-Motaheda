// Retired: queried a non-existent DB schema (lowercase columns / `categories` table).
// The surviving catalog data layer is `services/shopperCatalogApi.ts`, which targets
// the real Prisma schema (PascalCase columns: Name, Name_Ar, Price, is_active, ...).
// Safe to delete this file; left as an empty module to avoid build-tool noise.
export {};
