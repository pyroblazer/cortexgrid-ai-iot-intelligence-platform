# CortexGrid - Design Decisions & Tradeoffs

## Architecture Decisions

### 1. Monorepo with Turborepo
**Decision:** Use a Turborepo-managed monorepo with pnpm workspaces.
**Why:** Shared types between frontend and backend eliminate duplication and ensure type safety across the stack. Turborepo's task graph and caching speed up CI.
**Tradeoff:** More complex initial setup vs. polyrepo. Chosen because the teams share types, configs, and UI components heavily.

### 2. NestJS for Backend
**Decision:** NestJS over Express/Fastify directly.
**Why:** Modular architecture maps to our domain modules (Auth, Device, Telemetry, AI, Billing). Built-in support for guards, interceptors, pipes, and WebSocket gateway. Swagger auto-generation.
**Tradeoff:** Heavier abstraction than raw Express. Acceptable because the structured modules reduce cognitive load for the 7+ feature modules.

### 3. Next.js App Router
**Decision:** Next.js 14+ with App Router (not Pages Router).
**Why:** React Server Components reduce client-side JS. Streaming and Suspense improve perceived performance. Layout nesting matches our auth/dashboard layout needs.
**Tradeoff:** App Router is newer with fewer community patterns. Chosen because it's the forward path for React.

### 4. PostgreSQL + Prisma (not MongoDB)
**Decision:** Relational database with Prisma ORM.
**Why:** Multi-tenant SaaS needs strong relational constraints (User -> Membership -> Organization -> Device). Prisma provides type-safe queries that match our TypeScript stack. ACID transactions for billing/subscription operations.
**Tradeoff:** Time-series telemetry queries are less natural in PostgreSQL. Mitigated with proper indexing on (deviceId, timestamp) and optional TimescaleDB extension.

### 5. MQTT for IoT (not HTTP polling)
**Decision:** MQTT protocol with Mosquitto broker.
**Why:** Lightweight binary protocol ideal for IoT devices. Pub/sub model matches our one-to-many telemetry distribution. QoS levels ensure delivery. Last-will messages for device status.
**Tradeoff:** Requires running a broker service. Acceptable because it's the industry standard for IoT.

### 6. Redis for Caching + Pub/Sub
**Decision:** Single Redis instance for both caching and pub/sub.
**Why:** Latest telemetry readings cached in Redis reduce DB load for dashboard queries. Pub/sub enables real-time push to WebSocket gateway. BullMQ uses Redis as its backend.
**Tradeoff:** Single point of failure for cache. Mitigated by Redis persistence and cache being non-critical (fallback to DB).

### 7. Ollama for AI (not OpenAI API)
**Decision:** Primary AI provider is Ollama (local LLM).
**Why:** Open source, no API costs, data stays on-premises (important for IoT telemetry privacy). No rate limits. HuggingFace as secondary free-tier fallback.
**Tradeoff:** Requires GPU/CPU resources locally. LLM quality may be lower than GPT-4. Acceptable because the AI features (anomaly explanation, NL queries) work well with smaller models.

### 8. Stripe for Billing (not custom)
**Decision:** Stripe handles all payment logic.
**Why:** PCI-DSS compliance is extremely expensive. Stripe provides subscription management, usage-based billing, webhooks, and a hosted checkout — all without handling credit cards.
**Tradeoff:** Stripe lock-in and fees (2.9% + 30c). Acceptable because the alternative (building payment infrastructure) violates PCI compliance requirements and is not feasible.

### 9. JWT Authentication with Refresh Tokens
**Decision:** Stateless JWT access tokens (15min) + refresh tokens (7 days) stored in DB.
**Why:** Short-lived access tokens limit exposure on compromise. Refresh tokens enable session continuity without frequent login. DB storage allows token revocation.
**Tradeoff:** Cannot revoke access tokens until expiry. Mitigated by short 15-minute TTL.

### 10. WebSocket for Real-time (not SSE)
**Decision:** Socket.io (WebSocket) for real-time telemetry streaming.
**Why:** Bidirectional communication needed for future command-and-control features. Socket.io provides reconnection, rooms (per organization), and fallback transport.
**Tradeoff:** Heavier than SSE. Acceptable because we need bidirectional communication.

## Security Decisions

- **Helmet:** Sets security headers (CSP, XSS protection, etc.)
- **Rate Limiting:** ThrottlerModule limits to 100 req/min per IP
- **Input Validation:** Zod on frontend, class-validator on backend
- **RBAC per Organization:** Roles (OWNER, ADMIN, MEMBER, VIEWER) with guard-based enforcement
- **Environment Variables:** All secrets via env vars, never committed

## Performance Decisions

- **Redis Caching:** Latest telemetry per device cached with 30s TTL
- **Prisma Indexing:** Composite indexes on (deviceId, timestamp DESC) for fast telemetry queries
- **React Server Components:** Dashboard data fetched server-side, reducing client waterfalls
- **ISR:** Device pages use ISR for balance between freshness and performance

## Testing Strategy

- **Unit Tests:** Services and utilities with mocked dependencies (Jest)
- **Integration Tests:** API + real PostgreSQL (isolated test DB per run)
- **E2E Tests:** Playwright for frontend, supertest for API
- **Postman/Newman:** API contract tests in CI
- **Target:** 70% code coverage
