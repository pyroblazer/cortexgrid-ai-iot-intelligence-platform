# ─── Stage 1: Dependencies ────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma ./apps/api/prisma/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile --prod=false

# ─── Stage 2: Build ───────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/api ./apps/api
COPY packages ./packages

RUN cd apps/api && npx prisma generate && npx nest build

# Prune dev dependencies for production
RUN pnpm install --frozen-lockfile --prod

# ─── Stage 3: Production ──────────────────────────────────────────────────
FROM node:20-alpine AS prod

RUN apk add --no-cache tini

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY --from=build --chown=appuser:appgroup /app/apps/api/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/apps/api/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/apps/api/prisma ./prisma
COPY --from=build --chown=appuser:appgroup /app/apps/api/package.json ./

USER appuser

EXPOSE 3001

ENV NODE_ENV=production

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/main.js"]
