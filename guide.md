# CortexGrid - Quick Start Guide

Get CortexGrid running with a single command. No environment configuration needed.

## One Command (Docker)

```bash
docker compose up --build
```

That's it. Open http://localhost:3000 and login with `demo@cortexgrid.io` / `Demo@1234`.

All services start automatically: PostgreSQL, Redis, Mosquitto, API (with auto-migration + seed), Web frontend, IoT Simulator, Prometheus, Grafana, Elasticsearch, and Kibana.

> **First run** takes a few minutes to build Docker images. Subsequent starts are instant.

---

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | demo@cortexgrid.io / Demo@1234 |
| API | http://localhost:3001 | — |
| Swagger Docs | http://localhost:3001/api/v1/docs | — |
| Grafana | http://localhost:3002 | admin / cortexgrid |
| Prometheus | http://localhost:9090 | — |
| Kibana | http://localhost:5601 | — |

---

## Useful Docker Commands

```bash
# Start all services (foreground, with logs)
docker compose up --build

# Start all services (detached / background)
docker compose up --build -d

# View logs for a specific service
docker compose logs -f api
docker compose logs -f web

# Stop all services
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v

# Rebuild a single service
docker compose up --build -d api
```

---

## Local Development (Without Docker)

If you want to run services individually for development:

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9, Docker

# Install dependencies
pnpm install

# Start infrastructure only
docker compose up -d postgres redis mosquitto

# Copy env (defaults work for local dev)
cp .env.example .env

# Set up database
cd apps/api
npx prisma generate
npx prisma migrate dev
npx prisma db seed
cd ../..

# Start dev servers
pnpm dev
```

See [docs/setup-guide.md](docs/setup-guide.md) for detailed local development instructions.

---

## Running Tests

```bash
# All unit tests
pnpm test:unit

# All integration tests (needs postgres + redis)
docker compose up -d postgres redis
pnpm test:integration

# E2E tests
pnpm --filter @cortexgrid/api test:e2e
pnpm --filter @cortexgrid/web test:e2e

# Coverage report
pnpm --filter @cortexgrid/api test:cov
```

---

## Troubleshooting

### Port already in use
```bash
# Stop all containers and try again
docker compose down

# Or find what's using the port
netstat -ano | findstr :3001
```

### Database connection failed
```bash
docker compose logs postgres
docker compose restart postgres
```

### Clean start
```bash
docker compose down -v
docker compose up --build
```

### API health check
```bash
curl http://localhost:3001/health
```

---

## Further Reading

- [README.md](README.md) - Full project documentation
- [docs/setup-guide.md](docs/setup-guide.md) - Detailed local development setup
- [docs/design-decisions.md](docs/design-decisions.md) - Architecture decisions and tradeoffs
