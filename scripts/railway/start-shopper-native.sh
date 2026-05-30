#!/usr/bin/env bash
set -euo pipefail
exec npx serve apps/shopper-native/dist -l "${PORT:-3000}" --no-clipboard
