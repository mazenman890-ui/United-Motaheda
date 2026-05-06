#!/usr/bin/env node
/**
 * Idempotent product ingestion from raw CSV (e.g. B-Connect export).
 * Usage: node scripts/ingest-products.mjs path/to/file.csv [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import csv from "csv-parser";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArg = args.find((a) => !a.startsWith("--"));

if (!fileArg) {
  console.error("Usage: node scripts/ingest-products.mjs <file.csv> [--dry-run]");
  process.exit(1);
}

const rows = await new Promise((resolve, reject) => {
  const buffer = [];
  fs.createReadStream(path.resolve(fileArg))
    .pipe(csv())
    .on("data", (row) => buffer.push(row))
    .on("end", () => resolve(buffer))
    .on("error", reject);
});

function pick(row, keys) {
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [String(k).toLowerCase().replace(/\s+/g, "_"), v]),
  );
  for (const key of keys) {
    const norm = key.toLowerCase().replace(/\s+/g, "_");
    if (lower[norm] !== undefined && String(lower[norm]).length) {
      return String(lower[norm]).trim();
    }
  }
  return "";
}

const seen = new Map();
const out = [];

for (const row of rows) {
  const nameEn = pick(row, ["name_en", "nameen", "english_name", "product_name_en"]);
  const nameAr = pick(row, ["name_ar", "namear", "arabic_name", "product_name_ar", "name"]);
  const sku = pick(row, ["sku", "code", "product_code", "item_code"]);
  const internationalCode = pick(row, [
    "international_code",
    "gtin",
    "barcode",
    "international",
    "ean",
  ]);
  const categoryEn = pick(row, ["category_en", "category", "cat_en"]);
  const categoryAr = pick(row, ["category_ar", "cat_ar"]);

  const dedupeKey =
    (sku && `sku:${sku.toLowerCase()}`)
    || (internationalCode && `ic:${internationalCode}`)
    || `name:${nameEn.toLowerCase()}|${nameAr.toLowerCase()}`;

  if (!nameEn && !nameAr) {
    continue;
  }

  if (seen.has(dedupeKey)) {
    continue;
  }
  seen.set(dedupeKey, true);

  out.push({
    name_en: nameEn || nameAr,
    name_ar: nameAr || nameEn,
    sku: sku || internationalCode || dedupeKey,
    international_code: internationalCode,
    category_en: categoryEn || "general-healthcare",
    category_ar: categoryAr || categoryEn || "عام",
  });
}

const summary = {
  sourceRows: rows.length,
  uniqueRows: out.length,
  dryRun,
};

if (dryRun) {
  console.log(JSON.stringify({ summary, sample: out.slice(0, 5) }, null, 2));
} else {
  console.log(JSON.stringify({ summary, rows: out }, null, 2));
}
