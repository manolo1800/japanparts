# ==============================================================================
# Production Dockerfile — @japonparts/worker
# ==============================================================================

# Stage 1: Build
FROM node:22-alpine AS builder

RUN npm install -g pnpm@11.22.0

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/worker/package.json ./apps/worker/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker

RUN pnpm --filter @japonparts/shared build
RUN pnpm --filter @japonparts/worker build

RUN pnpm --filter @japonparts/worker --prod --legacy deploy /app/pruned

# Stage 2: Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 workerjs

COPY --from=builder --chown=workerjs:nodejs /app/apps/worker/dist ./dist
COPY --from=builder --chown=workerjs:nodejs /app/pruned/node_modules ./node_modules
COPY --from=builder --chown=workerjs:nodejs /app/apps/worker/package.json ./package.json

USER workerjs

CMD ["node", "dist/main.js"]
