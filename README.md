# CortexGrid - AI-Powered IoT Intelligence Platform

A production-grade, fullstack multi-tenant SaaS platform for managing IoT devices, ingesting real-time telemetry, detecting anomalies with AI, and billing customers through Stripe.

Built with an enterprise-grade monorepo architecture using open-source technologies throughout.

---

## Why CortexGrid?

Traditional IoT platforms are either prohibitively expensive or lack the intelligence layer needed to make sense of sensor data at scale. CortexGrid solves this by combining:

- **Real-time IoT telemetry ingestion** via MQTT (the industry standard for IoT messaging)
- **AI-powered insights** using local LLMs (Ollama) so your data never leaves your infrastructure
- **Multi-tenant SaaS architecture** so multiple organizations can share the platform with full data isolation
- **Stripe-integrated billing** with subscription plans and usage-based enforcement

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    USERS / BROWSERS                   │
└──────────────┬──────────────────────┬────────────────┘
               │ HTTPS                │ WebSocket
┌──────────────▼──────────┐  ┌────────▼────────────────┐
│   Next.js Frontend      │  │   Socket.io Gateway     │
│   (SSR + Client)        │  │   (Real-time telemetry)  │
└──────────┬──────────────┘  └────────┬────────────────┘
           │ REST API                  │ Redis Pub/Sub
┌──────────▼──────────────────────────▼─────────────────┐
│                    NestJS API Backend                   │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────────┐ │
│  │  Auth   │ │ Devices  │ │Telemt. │ │     AI      │ │
│  │ JWT/RBAC│ │  CRUD    │ │MQTT+WS │ │ Ollama+Stats│ │
│  └─────────┘ └──────────┘ └────────┘ └─────────────┘ │
│  ┌─────────┐ ┌──────────┐ ┌────────────────────────┐  │
│  │ Alerts  │ │  Billing │ │    Notifications       │  │
│  │ Rules   │ │ Stripe   │ │    In-App + Email      │  │
│  └─────────┘ └──────────┘ └────────────────────────┘  │
└──┬──────────┬──────────┬──────────┬───────────────────┘
   │          │          │          │
┌──▼───┐  ┌──▼───┐  ┌──▼───┐  ┌──▼──────┐
│Postgr│  │Redis │  │MQTT  │  │BullMQ   │
│SQL   │  │Cache │  │Mosqui│  │Job Queue│
└──────┘  └──────┘  │tto   │  └─────────┘
                    └──┬───┘
                ┌──────▼──────┐
                │IoT Simulator│
                │(6 profiles) │
                └─────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Monorepo** | Turborepo + pnpm | Shared types across frontend/backend, cached builds, single CI pipeline |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS | SSR for fast initial load, React Server Components, streaming |
| **Backend** | NestJS, TypeScript, Prisma ORM | Modular architecture, type-safe DB queries, auto-generated Swagger |
| **Database** | PostgreSQL 16 | ACID transactions for billing, relational integrity for multi-tenancy |
| **Cache** | Redis 7 | Sub-millisecond reads for latest telemetry, pub/sub for real-time WebSocket |
| **IoT Protocol** | MQTT (Eclipse Mosquitto) | Lightweight binary protocol, QoS guarantees, last-will for device status |
| **AI** | Ollama (local LLM) | Zero API cost, data stays on-prem, no rate limits |
| **Payments** | Stripe (sandbox) | PCI-DSS compliance without handling credit cards |
| **Background Jobs** | BullMQ + Redis | Async processing for AI queries, alert evaluation, billing webhooks |
| **Observability** | Prometheus + Grafana + ELK | Metrics, dashboards, centralized logging - all open source |
| **Testing** | Jest + Playwright + Postman/Newman | Unit, integration, E2E, and API contract testing |

---

## Compliance & Security Standards

CortexGrid implements enforceable controls aligned with major industry standards. Below is a mapping of each standard to the specific code-level controls that satisfy its requirements.

### ISO 27001 — Information Security Management System (ISMS)

| Control Area | Implementation | Code Reference |
|-------------|---------------|----------------|
| **Access Control (A.9)** | JWT authentication + RBAC (OWNER/ADMIN/MEMBER/VIEWER) per organization | `src/common/guards/jwt-auth.guard.ts`, `src/common/guards/roles.guard.ts` |
| **Audit Logging (A.12.4)** | All data-mutating operations logged with user, IP, user-agent, entity, action | `src/modules/audit/audit.service.ts`, `src/common/interceptors/audit.interceptor.ts` |
| **Encryption (A.10.1)** | bcrypt (12 rounds) for password hashing, JWT signed with separate secrets | `src/modules/auth/auth.service.ts` |
| **Incident Response (A.16.1)** | Real-time alerting engine with severity levels and lifecycle management | `src/modules/alert/alert.service.ts` |
| **Vulnerability Protection (A.12.6)** | Helmet security headers, rate limiting (100 req/min), input validation | `src/main.ts`, `ValidationPipe` config |
| **Data Retention (A.8.3.2)** | Configurable per-organization telemetry retention with automated cleanup | `src/common/queue/processors/retention.processor.ts` |

### ISO 9001 — Quality Management System (QMS)

| Control Area | Implementation | Code Reference |
|-------------|---------------|----------------|
| **Input Validation (7.5.3)** | Global `ValidationPipe` with whitelist + forbidNonWhitelisted on all endpoints | `src/main.ts` |
| **Error Handling (10.2)** | `AllExceptionsFilter` returns consistent error responses across all endpoints | `src/common/filters/all-exceptions.filter.ts` |
| **Monitoring & Measurement (9.1.1)** | Prometheus metrics, Grafana dashboards, health check endpoint | `src/modules/health/health.service.ts`, `docker/prometheus/`, `docker/grafana/` |
| **Test Coverage (7.1.5)** | 69+ integration tests across all modules, CI-enforced pass requirement | `apps/api/test/*.integration.spec.ts` |
| **Documented Processes (7.5)** | Swagger/OpenAPI auto-generated docs, design decision records | `src/main.ts` (Swagger setup), `docs/` |

### GDPR — General Data Protection Regulation

| Right | Implementation | Endpoint | Code Reference |
|-------|---------------|----------|----------------|
| **Art. 15 — Right of Access** | Full user data export including memberships, notifications, alerts | `GET /api/v1/auth/me` | `src/modules/auth/auth.service.ts:getProfile()` |
| **Art. 17 — Right to Erasure** | Account deletion with cascading cleanup of personal data | `DELETE /api/v1/auth/me` | `src/modules/auth/auth.service.ts:deleteUserAccount()` |
| **Art. 20 — Data Portability** | Complete user data export as structured JSON | `GET /api/v1/auth/me/export` | `src/modules/auth/auth.service.ts:exportUserData()` |
| **Art. 25 — Data Protection by Design** | Minimal data collection, retention enforcement, organization-scoped queries | — | `src/common/queue/processors/retention.processor.ts` |
| **Art. 32 — Security of Processing** | Encryption at rest (bcrypt), in transit (HTTPS), access control (JWT+RBAC) | — | `src/modules/auth/auth.service.ts` |
| **Art. 33 — Breach Notification** | Audit trail + alerting system for detecting unauthorized access | `GET /api/v1/audit-logs` | `src/modules/audit/audit.service.ts` |
| **Art. 5(1)(e) — Storage Limitation** | Automated data retention enforcement based on org settings | — | `src/common/queue/processors/retention.processor.ts` |

### SOC 2 Type II — Trust Services Criteria

| Criteria | Control | Code Reference |
|----------|---------|----------------|
| **CC6.1 — Logical Access** | JWT with short-lived access tokens (15min), Redis-stored refresh tokens with instant revocation | `src/modules/auth/auth.service.ts` |
| **CC6.2 — Authentication** | bcrypt password hashing (12 rounds), credential verification on every request | `src/modules/auth/auth.service.ts` |
| **CC6.3 — Authorization** | RBAC with 4 roles per organization, `@Roles()` decorator for endpoint-level enforcement | `src/common/guards/roles.guard.ts` |
| **CC7.1 — Detection & Monitoring** | Audit logging of all mutations, HTTP request logging interceptor | `src/modules/audit/`, `src/common/interceptors/logging.interceptor.ts` |
| **CC7.2 — Incident Response** | Alert rules engine with configurable conditions and severity escalation | `src/modules/alert/` |
| **CC8.1 — Change Management** | Git-based CI/CD pipeline with automated testing gates | `.github/workflows/ci.yml` |

### NIST Cybersecurity Framework (CSF) 2.0

| Function | Implementation | Code Reference |
|----------|---------------|----------------|
| **Identify (ID.AM)** | Asset inventory via device management module, organization-based data classification | `src/modules/device/` |
| **Protect (PR.AC)** | Access control (JWT+RBAC), rate limiting, input validation, Helmet security headers | `src/common/guards/`, `src/main.ts` |
| **Protect (PR.DS)** | Data encryption at rest (bcrypt), parameterized queries (Prisma ORM), data isolation per org | `src/modules/auth/`, `src/common/prisma/` |
| **Detect (DE.CM)** | Alert rules engine, anomaly detection (z-score), continuous monitoring via health checks | `src/modules/alert/`, `src/modules/ai/` |
| **Respond (RS.RP)** | Alert lifecycle (Active -> Acknowledged -> Resolved), notification delivery | `src/modules/alert/`, `src/modules/notification/` |
| **Recover (RC.RP)** | Docker volume persistence for PostgreSQL/Redis, infrastructure-as-code via docker-compose | `docker-compose.yml` |

### IEC 62443 — Industrial Automation and Control Systems Security

| Requirement | Implementation | Code Reference |
|-------------|---------------|----------------|
| **Zone Model (SR 5.1)** | Multi-tenant organization isolation — all queries scoped by `organizationId` | Every service module filters by `organizationId` |
| **Device Authentication (SR 1.1)** | MQTT broker with username/password config, device lookup by serial number or ID | `src/modules/telemetry/mqtt/mqtt.service.ts` |
| **Input Validation (SR 3.1)** | MQTT payload schema validation rejects malformed/unexpected data | `src/common/utils/validate-mqtt-payload.ts` |
| **Audit Trail (SR 6.1)** | Comprehensive audit logging of all data mutations | `src/modules/audit/audit.service.ts` |
| **Communication Integrity (SR 4.1)** | MQTT QoS 1 (at-least-once delivery), TLS-ready broker configuration | `src/modules/telemetry/mqtt/mqtt.service.ts` |

### OWASP Top 10 (2021)

| Risk | Mitigation | Code Reference |
|------|-----------|----------------|
| **A01 — Broken Access Control** | JWT auth guard on all endpoints (except `@Public()`), RBAC via `RolesGuard` | `src/common/guards/jwt-auth.guard.ts`, `src/common/guards/roles.guard.ts` |
| **A02 — Cryptographic Failures** | bcrypt (12 rounds) for passwords, separate JWT secrets for access/refresh tokens | `src/modules/auth/auth.service.ts` |
| **A03 — Injection** | Prisma ORM parameterized queries prevent SQL injection, `ValidationPipe` strips unexpected fields | `src/common/prisma/`, `src/main.ts` |
| **A04 — Insecure Design** | Multi-layer validation (DTO class-validator + Prisma schema + business logic), rate limiting | All DTO files, `src/main.ts` |
| **A05 — Security Misconfiguration** | Helmet for security headers (CSP, X-Frame-Options, etc.), CORS via environment variable | `src/main.ts` |
| **A06 — Vulnerable Components** | Docker pinned images (`postgres:16-alpine`, `redis:7-alpine`), pnpm lockfile | `docker-compose.yml`, `pnpm-lock.yaml` |
| **A07 — Auth Failures** | Vague error messages ("Invalid email or password"), account deactivation checks, token revocation on logout | `src/modules/auth/auth.service.ts` |
| **A08 — Data Integrity Failures** | JWT signature verification on every request, separate signing secrets | `src/modules/auth/strategies/jwt.strategy.ts` |
| **A09 — Logging Failures** | `LoggingInterceptor` records all HTTP requests, `AuditInterceptor` records all mutations, error logging | `src/common/interceptors/` |
| **A10 — SSRF** | Input validation on all endpoints, no user-controlled URL fetching in core services | All DTO files |

---

### Compliance Endpoints

| Endpoint | Standard | Purpose |
|----------|----------|---------|
| `GET /api/v1/audit-logs` | ISO 27001, SOC 2, NIST CSF | Query audit trail (OWNER/ADMIN only) |
| `GET /api/v1/auth/me/export` | GDPR Art. 20 | Export all user data (JSON) |
| `DELETE /api/v1/auth/me` | GDPR Art. 17 | Delete user account and personal data |
| `GET /health` | SOC 2, ISO 27001 | System health with compliance status |
| `PATCH /api/v1/auth/me` | ISO 27001 | Update user profile |
| `PATCH /api/v1/auth/me/password` | ISO 27001 | Change password (requires current password) |

### Multi-Tenant SaaS
- Organization-based isolation with membership roles (Owner, Admin, Member, Viewer)
- Invitation system with token-based email invites and 7-day expiration
- Per-organization plan limits (FREE: 5 devices, PRO: 50, ENTERPRISE: 1000)

### IoT Device Management
- Register, update, and decommission devices (sensors, actuators, gateways)
- Real-time status tracking (online/offline/maintenance)
- Device profiles with configurable metric definitions
- Tag-based organization and location tracking

### Real-Time Telemetry Dashboard
- MQTT-based ingestion from physical or simulated devices
- WebSocket push to connected dashboards (sub-100ms latency)
- Redis-cached latest readings for instant page loads
- Time-series aggregation (1m, 5m, 15m, 1h, 1d buckets)

### AI-Powered Insights
- Natural language queries ("What's the average temperature?") powered by Ollama
- Statistical anomaly detection using z-score analysis
- Telemetry summarization with trend analysis
- Graceful fallback to statistical summaries when Ollama is unavailable

### Alerts & Notifications
- Configurable alert rules with threshold conditions (gt, lt, eq, gte, lte)
- Severity levels: Critical, Warning, Info
- Alert lifecycle: Active -> Acknowledged -> Resolved
- Deduplicated alerting to prevent noise

### Billing (Stripe)
- Three subscription plans: Free, Pro ($29/mo), Enterprise ($99/mo)
- Stripe Checkout for secure payment processing
- Webhook-driven subscription state sync
- Automatic plan enforcement (device limits, feature access)

### Security
- JWT access tokens (15min) + refresh tokens (7 days) with Redis storage
- Role-Based Access Control (RBAC) per organization
- Input validation with Zod (frontend) + class-validator (backend)
- Rate limiting (100 req/min per IP)
- Helmet for security headers (CSP, XSS protection, etc.)
- CORS configured for cross-origin frontend

---

## Project Structure

```
cortexgrid/
├── apps/
│   ├── api/                    # NestJS Backend (77 files)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema (11 models, 10 enums)
│   │   │   └── seed.ts         # Demo data seeder
│   │   └── src/
│   │       ├── main.ts         # Bootstrap (Helmet, CORS, Swagger, rate limit)
│   │       ├── app.module.ts   # Root module composition
│   │       ├── common/         # Guards, interceptors, filters, decorators
│   │       │   ├── guards/     # JWT auth + RBAC role guards
│   │       │   ├── interceptors/ # Response transform + request logging
│   │       │   ├── filters/    # Global exception handler
│   │       │   ├── decorators/ # @CurrentUser, @Roles, @Public, @ApiPaginated
│   │       │   ├── prisma/     # PrismaClient lifecycle wrapper
│   │       │   ├── redis/      # ioredis wrapper (get/set/pub/sub)
│   │       │   └── queue/      # BullMQ job processors
│   │       └── modules/
│   │           ├── auth/       # Registration, login, JWT, refresh tokens
│   │           ├── organization/ # Org CRUD, memberships, invitations
│   │           ├── device/     # Device CRUD, status, plan limit enforcement
│   │           ├── telemetry/  # MQTT ingestion, WebSocket gateway, Redis cache
│   │           ├── ai/         # Ollama NL queries, anomaly detection, summaries
│   │           ├── alert/      # Alert rules, evaluation engine, lifecycle
│   │           ├── billing/    # Stripe checkout, portal, webhooks, plan limits
│   │           ├── notification/ # In-app notifications, read tracking
│   │           └── health/     # DB + Redis + MQTT health checks
│   │
│   ├── web/                    # Next.js Frontend (45 files)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/     # Login + Register pages
│   │       │   └── (dashboard)/ # Dashboard, Devices, Alerts, AI, Billing, Settings
│   │       ├── components/     # KPI cards, charts, tables, sidebar, top bar
│   │       ├── hooks/          # useTelemetry (WebSocket), useAuth
│   │       ├── stores/         # Zustand stores (auth, devices)
│   │       └── lib/            # API client (typed + JWT), Socket.io client
│   │
│   └── iot-simulator/          # MQTT device simulator (16 files)
│       └── src/
│           ├── devices/        # 6 profiles: temp, humidity, pressure, motion, power, gas
│           ├── mqtt/           # QoS 1 publishing with reconnect
│           └── utils/          # Gaussian noise, daily cycles, drift simulation
│
├── packages/
│   ├── types/                  # Shared TypeScript types (auth, device, telemetry, etc.)
│   ├── ui/                     # Reusable React components (Button, Card, DataTable, Modal...)
│   ├── config/                 # Plan limits, MQTT topics, Redis channels, DB config
│   └── eslint-config/          # Shared ESLint configs (base, Next.js, NestJS)
│
├── docker/
│   ├── postman/                # API test collection + environment
│   ├── prometheus/             # Scrape config for API metrics
│   ├── grafana/                # Pre-built dashboard (10 panels)
│   └── mosquitto/              # MQTT broker config
│
├── .github/workflows/ci.yml   # 9-job CI/CD pipeline
├── docker-compose.yml          # 10 services (postgres, redis, mosquitto, api, web, ...)
├── docs/
│   ├── architecture.puml       # PlantUML system diagram
│   ├── design-decisions.md     # 10 architecture decisions with tradeoffs
│   └── setup-guide.md          # Detailed setup instructions
└── guide.md                    # Fast terminal-based setup guide
```

---

## API Documentation

When the backend is running, full Swagger/OpenAPI docs are available at:

```
http://localhost:3001/api/v1/docs
```

Covers all endpoints across 9 tag groups:
- **Auth** - Register, Login, Refresh, Logout, Get Me
- **Organizations** - CRUD, Members, Invitations, Usage Stats
- **Devices** - CRUD, Status, Latest Telemetry, Pagination + Filtering
- **Telemetry** - Ingest, Query (time range + aggregation), Get Latest
- **AI** - Natural Language Query, Anomaly Detection, Telemetry Summary
- **Alerts** - List Alerts, CRUD Rules, Acknowledge, Resolve
- **Billing** - Subscription, Checkout, Portal, Webhooks, Plans
- **Notifications** - List, Read, Unread Count, Preferences
- **Health** - System health check (DB, Redis, MQTT)

---

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env

# 3. Start infrastructure
docker compose up -d postgres redis mosquitto

# 4. Set up database
cd apps/api
npx prisma generate
npx prisma migrate dev
npx prisma db seed
cd ../..

# 5. Start everything
pnpm dev
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/docs |
| Grafana | http://localhost:3002 |
| Prometheus | http://localhost:9090 |

**Demo credentials:** `demo@cortexgrid.io` / `Demo@1234`

---

## Testing

```bash
# Unit tests (services + utilities)
pnpm test:unit

# Integration tests (API + real database)
pnpm test:integration

# E2E API tests (supertest)
pnpm --filter @cortexgrid/api test:e2e

# E2E Frontend tests (Playwright - Chromium)
pnpm --filter @cortexgrid/web test:e2e

# Postman API contract tests (Newman)
newman run docker/postman/cortexgrid.postman_collection.json \
  -e docker/postman/cortexgrid.postman_environment.json

# Coverage report
pnpm --filter @cortexgrid/api test:cov
```

---

## Design Decisions

See [docs/design-decisions.md](docs/design-decisions.md) for the full rationale behind:
- Why Turborepo monorepo over polyrepo
- Why PostgreSQL + Prisma over MongoDB
- Why MQTT over HTTP polling for IoT
- Why Ollama over OpenAI API
- Why Stripe over custom payments
- Why WebSocket over SSE
- And more...

---

## CI/CD Pipeline

The GitHub Actions pipeline runs 9 jobs in sequence:

1. **Setup** - Install deps, cache node_modules + .turbo
2. **Lint** - ESLint across all packages
3. **Type Check** - TypeScript strict mode verification
4. **Unit Tests** - Jest with coverage reporting
5. **Integration Tests** - API + real PostgreSQL/Redis
6. **API Tests** - Newman running Postman collection
7. **E2E Tests** - Playwright with Docker Compose services
8. **Build** - Docker images pushed to GHCR
9. **Deploy** - SSH deploy with health verification (main branch only)

---

## Observability

Pre-configured Grafana dashboard (at `:3002`) tracks:
- API request rate, latency (p50/p95/p99), error rate
- Device ingestion rate, active devices
- WebSocket connections, Redis cache hit rate
- BullMQ queue depth, database connections

All metrics scraped by Prometheus from the API's `/api/v1/metrics` endpoint.

---

## License

This project is for educational and demonstration purposes.
