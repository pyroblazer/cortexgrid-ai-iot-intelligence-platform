# CortexGrid - Setup Guide

Two ways to run CortexGrid: **Docker** (recommended, zero config) or **local development** (for active coding).

---

## Option A: Docker (Recommended)

### Prerequisites

- **Docker** & Docker Compose

### One Command Start

```bash
./start.sh
```

This automatically stops any previous containers, then builds and starts everything fresh.

All services start automatically with sensible defaults:
- PostgreSQL, Redis, Mosquitto start first
- API waits for infrastructure, then auto-runs migrations and seeds demo data
- Web frontend starts after API is healthy
- IoT Simulator, Prometheus, Grafana, Elasticsearch, Kibana start in parallel

No `.env` file needed. No manual database setup. No configuration required.

### Alternative commands

```bash
# Same thing via pnpm (cross-platform)
pnpm docker:start

# Same thing manually
docker compose down --remove-orphans && docker compose up --build
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | demo@cortexgrid.io / Demo@1234 |
| API | http://localhost:3001 | — |
| Swagger Docs | http://localhost:3001/api/v1/docs | — |
| Grafana | http://localhost:3002 | admin / cortexgrid |
| Prometheus | http://localhost:9090 | — |
| Kibana | http://localhost:5601 | — |

### Docker Commands Reference

```bash
# Start fresh (recommended)
./start.sh

# Start in background
./start.sh -d

# Via pnpm (cross-platform)
pnpm docker:start

# Stop
pnpm docker:stop
# or
docker compose down

# View logs
docker compose logs -f api
docker compose logs -f web
docker compose logs -f iot-simulator

# Stop and wipe all data (full reset)
docker compose down -v

# Rebuild a single service after code changes
docker compose up --build -d api
```

---

## Option B: Local Development

For active development with hot-reload and faster iteration.

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Docker** (for PostgreSQL, Redis, Mosquitto)
- **Git**

### Step 1: Clone and Install

```bash
git clone <repo-url> cortexgrid
cd cortexgrid
pnpm install
```

### Step 2: Start Infrastructure

```bash
docker compose up -d postgres redis mosquitto
```

Wait for services to be healthy:

```bash
docker compose ps
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

The defaults work for local development. Only edit if you changed ports or credentials.

### Step 4: Database Setup

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
npx prisma db seed
cd ../..
```

### Step 5: Start Development Servers

```bash
# Option A: Start everything
pnpm dev

# Option B: Start individually (in separate terminals)
pnpm --filter @cortexgrid/api dev            # API on :3001
pnpm --filter @cortexgrid/web dev            # Web on :3000
pnpm --filter @cortexgrid/iot-simulator dev  # Simulator
```

### Step 6: Verify

```bash
curl http://localhost:3001/health
```

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

### E2E Tests

```bash
# API E2E tests
pnpm --filter @cortexgrid/api test:e2e

# Frontend E2E tests (Playwright)
pnpm --filter @cortexgrid/web test:e2e
```

### Postman Collection (Newman)

```bash
npm install -g newman
pnpm --filter @cortexgrid/api dev
# In another terminal:
newman run docker/postman/cortexgrid.postman_collection.json \
  -e docker/postman/cortexgrid.postman_environment.json
```

### Coverage

```bash
pnpm --filter @cortexgrid/api test:cov
pnpm --filter @cortexgrid/iot-simulator test:cov
```

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://cortexgrid:cortexgrid@localhost:5432/cortexgrid` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `MQTT_BROKER_URL` | MQTT broker URL | `mqtt://localhost:1883` |
| `MQTT_USERNAME` | MQTT username | `cortexgrid` |
| `MQTT_PASSWORD` | MQTT password | `cortexgrid` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | `local-dev-access-secret-change-in-production` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | `local-dev-refresh-secret-change-in-production` |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `7d` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_test_placeholder` |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://localhost:11434` |
| `NEXT_PUBLIC_API_URL` | Backend API URL for frontend | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for frontend | `ws://localhost:3001` |
| `PORT` | API server port | `3001` |

> When running via Docker Compose, all variables are pre-configured. No `.env` file needed.

---

## Troubleshooting

### Port already in use
```bash
# Stop all Docker containers
docker compose down

# Or find what's using the port
lsof -i :3001    # macOS/Linux
netstat -ano | findstr :3001  # Windows
```

### Database connection failed
```bash
docker compose ps postgres
docker compose logs postgres
docker compose restart postgres
```

### Prisma issues (local dev only)
```bash
cd apps/api
npx prisma generate
npx prisma migrate reset  # WARNING: deletes all data
npx prisma db seed
```

### Clean start
```bash
# Docker: remove all data and rebuild
docker compose down -v
docker compose up --build

# Local: clean build artifacts
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Further Reading

- [README.md](../README.md) - Full project documentation
- [guide.md](../guide.md) - Quick start guide
- [docs/design-decisions.md](design-decisions.md) - Architecture decisions and tradeoffs
