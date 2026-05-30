#!/usr/bin/env bash
set -euo pipefail

echo "==> [shopper-native] Installing dependencies…"
cd apps/shopper-native
npm install --no-audit --no-fund

echo "==> [shopper-native] Exporting Expo web bundle…"
npx expo export --platform web --output-dir dist

echo "==> [shopper-native] Build complete → apps/shopper-native/dist"
