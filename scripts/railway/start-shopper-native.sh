#!/usr/bin/env bash
set -euo pipefail
npm install -g serve --no-audit --no-fund --silent
exec serve apps/shopper-native/dist -l "${PORT:-3000}" --no-clipboard
