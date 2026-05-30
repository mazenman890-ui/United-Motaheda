#!/usr/bin/env bash
set -euo pipefail

echo "==> [api] Installing contracts…"
(cd packages/contracts && npm install --no-audit --no-fund --ignore-scripts)

echo "==> [api] Installing api dependencies…"
cd apps/api
npm install --legacy-peer-deps --include=dev --no-audit --no-fund

echo "==> [api] Generating Prisma client…"
npx prisma generate --schema=prisma/schema.prisma

echo "==> [api] Building NestJS…"
npx nest build

echo "==> [api] Build complete."
