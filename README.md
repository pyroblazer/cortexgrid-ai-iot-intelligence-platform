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

## Features

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
