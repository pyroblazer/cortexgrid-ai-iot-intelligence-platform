# ─── Stage 1: Dependencies ────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/iot-simulator/package.json apps/iot-simulator/
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
COPY --from=deps /app/apps/iot-simulator/node_modules ./apps/iot-simulator/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/iot-simulator/src ./apps/iot-simulator/src
COPY apps/iot-simulator/tsconfig.json ./apps/iot-simulator/
COPY apps/iot-simulator/package.json ./apps/iot-simulator/
COPY packages/types/src ./packages/types/src
COPY packages/types/package.json packages/types/tsconfig.json ./packages/types/
COPY packages/ui/src ./packages/ui/src
COPY packages/ui/package.json packages/ui/tsconfig.json packages/ui/tailwind.config.ts packages/ui/.eslintrc.js ./packages/ui/
COPY packages/eslint-config/index.js packages/eslint-config/nest.js packages/eslint-config/next.js packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/config/src ./packages/config/src
COPY packages/config/package.json packages/config/tsconfig.json ./packages/config/

RUN cd apps/iot-simulator && pnpm build

# ─── Stage 3: Production ──────────────────────────────────────────────────
FROM node:20-alpine AS prod

RUN apk add --no-cache tini

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY --from=build --chown=appuser:appgroup /app/apps/iot-simulator/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/apps/iot-simulator/package.json ./

RUN node -e "const p=require('./package.json'); delete p.devDependencies; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2))" && npm install

USER appuser

ENV NODE_ENV=production

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/main.js"]
