#!/usr/bin/env bash
set -euo pipefail

echo "==> [shopper-web] Installing workspace dependencies…"
npm install --no-audit --no-fund

echo "==> [shopper-web] Building Vite bundle…"
npm run build --workspace=apps/shopper-web

echo "==> [shopper-web] Build complete → apps/shopper-web/dist"
