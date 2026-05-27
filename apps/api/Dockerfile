# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy the shared packages the API imports from (contracts, etc.)
# We install them standalone so we never touch the root workspace
# (which has Expo deps that conflict with React 18 on a clean npm install).
COPY packages/contracts ./packages/contracts

# Install contracts' own dependencies (just zod)
RUN cd packages/contracts && npm install --ignore-scripts --no-audit --no-fund

# Copy API source
COPY apps/api ./apps/api

# Rewrite @pharmacy/contracts from workspace "*" to a local file reference
# so npm install resolves it without needing the full monorepo workspace.
RUN node -e " \
  const fs = require('fs'); \
  const path = '/workspace/apps/api/package.json'; \
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8')); \
  pkg.dependencies['@pharmacy/contracts'] = 'file:../../packages/contracts'; \
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2)); \
"

# Install API deps only — no root workspace, no Expo conflict
RUN cd apps/api && \
    npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund

# Build the NestJS app (webpack → single main.js in apps/api/dist/)
RUN cd apps/api && npx nest build

# ── Stage 2: lean runtime image ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Only copy what is needed to run
COPY --from=builder /workspace/apps/api/dist       ./dist
COPY --from=builder /workspace/apps/api/node_modules ./node_modules
COPY --from=builder /workspace/apps/api/package.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
