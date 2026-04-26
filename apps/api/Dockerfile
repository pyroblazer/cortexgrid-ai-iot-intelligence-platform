# ─── Stage 1: Dependencies ────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile --prod=false

# ─── Stage 2: Build ───────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npx nest build

# Prune dev dependencies for production
RUN pnpm install --frozen-lockfile --prod

# ─── Stage 3: Production ──────────────────────────────────────────────────
FROM node:20-alpine AS prod

RUN apk add --no-cache tini

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=build --chown=appuser:appgroup /app/package.json ./

USER appuser

EXPOSE 3001

ENV NODE_ENV=production

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/main.js"]
