# ── Stage 1: install + build ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy root workspace manifest + lockfile so npm ci works from root
COPY package.json package-lock.json ./

# Copy shared packages (provides @pharmacy/contracts, @pharmacy/types, etc.)
COPY packages/ ./packages/

# Copy the API source
COPY apps/api/ ./apps/api/

# Patch the root workspace list to include apps/api so that
# @pharmacy/contracts resolves via npm workspaces during install.
RUN node -e " \
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
  if (!pkg.workspaces.includes('apps/api')) pkg.workspaces.push('apps/api'); \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
"

# Install all workspace deps (uses the root package-lock.json)
RUN npm install --workspaces --include-workspace-root --ignore-scripts

# Build the NestJS app (outputs to apps/api/dist/)
WORKDIR /workspace/apps/api
RUN npx nest build

# ── Stage 2: lean production image ───────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy compiled output
COPY --from=builder /workspace/apps/api/dist ./dist

# Copy runtime node_modules (root + API-level)
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/apps/api/node_modules ./apps/api/node_modules 2>/dev/null || true

# Copy package.json so Node can resolve "name" / engines at runtime
COPY --from=builder /workspace/apps/api/package.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
