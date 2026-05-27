/**
 * Applies manual-payment migrations in two steps (Postgres enum 55P04 fix).
 * Requires SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 *
 * Usage: node scripts/apply-manual-payment-sql.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const projectRef = process.env.SUPABASE_PROJECT_REF ?? "gntpxffonjvnvadjclpl";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error(
    "Set SUPABASE_ACCESS_TOKEN, then run: node scripts/apply-manual-payment-sql.mjs",
  );
  process.exit(1);
}

async function runSql(name, file) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`${name} failed:`, res.status, text);
    process.exit(1);
  }
  console.log(`${name} OK`);
}

await runSql("Step 1 (enum)", "20260533_manual_payment.sql");
await runSql("Step 2 (columns + storage + RLS)", "20260535_manual_payment_apply.sql");
console.log("Manual payment migrations complete.");
