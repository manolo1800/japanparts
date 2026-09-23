# ==============================================================================
# Production Dockerfile — @japonparts/backend
# ==============================================================================

# Stage 1: Build
FROM node:22-alpine AS builder

RUN npm install -g pnpm@11.22.0

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

RUN pnpm --filter @japonparts/shared build
RUN pnpm --filter @japonparts/backend build

RUN pnpm --filter @japonparts/backend --prod --legacy deploy /app/pruned

# Stage 2: Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/pruned/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./package.json

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main.js"]
