# CortexGrid - Setup Guide

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Docker** & Docker Compose
- **Git**

---

## Quick Start (Terminal Commands)

### 1. Clone and enter the project

```bash
git clone <repo-url> cortexgrid
cd cortexgrid
```

### 2. Install pnpm (if not installed)

```bash
npm install -g pnpm@9
```

### 3. Install all dependencies

```bash
pnpm install
```

### 4. Copy environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the values. For local development, the defaults work out of the box.

### 5. Start infrastructure services (PostgreSQL, Redis, Mosquitto)

```bash
docker compose up -d postgres redis mosquitto
```

Wait for services to be healthy:

```bash
docker compose ps
```

### 6. Generate Prisma client and run migrations

```bash
cd apps/api
pnpm db:generate
pnpm db:migrate
cd ../..
```

### 7. Seed the database with demo data

```bash
cd apps/api
pnpm db:seed
cd ../..
```

### 8. Start development servers

In separate terminals or using tmux:

```bash
# Terminal 1 - API backend
pnpm --filter @cortexgrid/api dev

# Terminal 2 - Web frontend
pnpm --filter @cortexgrid/web dev

# Terminal 3 - IoT simulator (optional)
pnpm --filter @cortexgrid/iot-simulator dev
```

Or start everything at once:

```bash
pnpm dev
```

### 9. Access the platform

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| API Docs (Swagger) | http://localhost:3001/api/docs |
| Grafana | http://localhost:3002 (admin/admin) |
| Prometheus | http://localhost:9090 |
| Kibana | http://localhost:5601 |

### 10. Login with demo credentials

- **Email:** demo@cortexgrid.io
- **Password:** Demo@1234

---

## Full Docker Compose (All Services)

Start everything including observability stack:

```bash
docker compose up -d
```

This starts: PostgreSQL, Redis, Mosquitto, API, Web, IoT Simulator, Prometheus, Grafana, Elasticsearch, Kibana.

---

## Running Tests

### Unit Tests

```bash
pnpm test:unit
```

### Integration Tests

```bash
# Ensure PostgreSQL and Redis are running
docker compose up -d postgres redis
pnpm test:integration
```

### E2E Tests (API)

```bash
pnpm --filter @cortexgrid/api test:e2e
```

### E2E Tests (Frontend - Playwright)

```bash
pnpm --filter @cortexgrid/web test:e2e
```

### Postman Collection (Newman)

```bash
# Install newman globally
npm install -g newman

# Start the API server
pnpm --filter @cortexgrid/api dev

# In another terminal, run the collection
newman run docker/postman/cortexgrid.postman_collection.json \
  -e docker/postman/cortexgrid.postman_environment.json
```

### Test Coverage

```bash
pnpm --filter @cortexgrid/api test:cov
pnpm --filter @cortexgrid/iot-simulator test:cov
```

---

## Building for Production

### Build all packages

```bash
pnpm build
```

### Docker Production Build

```bash
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
```

---

## Project Structure

```
cortexgrid/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── prisma/           # Database schema & migrations
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/       # Shared guards, interceptors, decorators
│   │   │   └── modules/      # Feature modules
│   │   │       ├── auth/
│   │   │       ├── device/
│   │   │       ├── telemetry/
│   │   │       ├── alert/
│   │   │       ├── ai/
│   │   │       ├── billing/
│   │   │       ├── notification/
│   │   │       └── organization/
│   │   └── test/
│   ├── web/                  # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/          # App Router pages
│   │   │   ├── components/   # React components
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── stores/       # Zustand stores
│   │   │   └── lib/          # API client, utilities
│   │   └── tests/            # Playwright E2E tests
│   └── iot-simulator/        # IoT device simulator
│       └── src/
├── packages/
│   ├── ui/                   # Shared React components
│   ├── types/                # Shared TypeScript types
│   ├── config/               # Shared configuration
│   └── eslint-config/        # Shared ESLint config
├── docker/                   # Docker configs
│   ├── postman/
│   ├── prometheus/
│   ├── grafana/
│   └── mosquitto/
├── docs/                     # Documentation
├── .github/workflows/        # CI/CD
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://cortexgrid:cortexgrid@localhost:5432/cortexgrid` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `MQTT_BROKER_URL` | MQTT broker URL | `mqtt://localhost:1883` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | *required* |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | *required* |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `7d` |
| `STRIPE_SECRET_KEY` | Stripe API key (test mode) | *required for billing* |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | *required for billing* |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://localhost:11434` |
| `NEXT_PUBLIC_API_URL` | Backend API URL for frontend | `http://localhost:3001` |
| `PORT` | API server port | `3001` |

---

## Useful Commands

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check

# Format code
pnpm format

# Clean all build artifacts
pnpm clean

# Prisma Studio (DB GUI)
pnpm --filter @cortexgrid/api db:studio

# View Docker logs
docker compose logs -f api
docker compose logs -f web
```
