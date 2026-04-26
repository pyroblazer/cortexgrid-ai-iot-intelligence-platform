# CortexGrid - Fast Setup Guide (Terminal Commands)

Run these commands in order to get CortexGrid running as fast as possible.

## One-Liner Bootstrap (Copy-Paste Ready)

```bash
# Ensure pnpm is installed
npm install -g pnpm@9

# Install all dependencies
pnpm install

# Copy env and start infrastructure
cp .env.example .env && docker compose up -d postgres redis mosquitto

# Wait for postgres to be ready (5 seconds)
sleep 5

# Generate Prisma client, migrate, and seed
cd apps/api && pnpm db:generate && pnpm db:migrate && pnpm db:seed && cd ../..

# Start all dev servers
pnpm dev
```

That's it. Open http://localhost:3000 and login with `demo@cortexgrid.io` / `Demo@1234`.

---

## Step-by-Step (Detailed)

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Environment Setup

```bash
cp .env.example .env
```

The defaults work for local development. Only edit if you changed ports/credentials.

### Step 3: Start Infrastructure

```bash
docker compose up -d postgres redis mosquitto
```

### Step 4: Database Setup

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
cd ../..
```

### Step 5: Start Development

```bash
# Option A: Start everything
pnpm dev

# Option B: Start individually (in separate terminals)
pnpm --filter @cortexgrid/api dev      # API on :3001
pnpm --filter @cortexgrid/web dev      # Web on :3000
pnpm --filter @cortexgrid/iot-simulator dev  # Simulator
```

### Step 6: Verify

```bash
# API health check
curl http://localhost:3001/health

# API docs
open http://localhost:3001/api/docs

# Frontend
open http://localhost:3000
```

---

## Full Stack with Observability

```bash
# Start everything (including Prometheus, Grafana, ELK)
docker compose up -d

# Access services:
# Frontend:     http://localhost:3000
# API:          http://localhost:3001
# API Docs:     http://localhost:3001/api/docs
# Grafana:      http://localhost:3002 (admin/admin)
# Prometheus:   http://localhost:9090
# Kibana:       http://localhost:5601
```

---

## Running Tests

```bash
# All unit tests
pnpm test:unit

# All integration tests (needs postgres + redis running)
pnpm test:integration

# API E2E tests
pnpm --filter @cortexgrid/api test:e2e

# Frontend E2E tests (Playwright)
pnpm --filter @cortexgrid/web test:e2e

# Coverage report
pnpm --filter @cortexgrid/api test:cov

# Postman/Newman API tests
npm install -g newman
newman run docker/postman/cortexgrid.postman_collection.json \
  -e docker/postman/cortexgrid.postman_environment.json
```

---

## Production Build

```bash
# Build all
pnpm build

# Docker production build
docker compose build
docker compose up -d
```

---

## Troubleshooting

### Port already in use
```bash
# Find process using port
lsof -i :3001    # API
lsof -i :3000    # Web
lsof -i :5432    # PostgreSQL

# Kill it
kill -9 <PID>
```

### Database connection failed
```bash
# Check if postgres is running
docker compose ps postgres

# Restart it
docker compose restart postgres

# Check logs
docker compose logs postgres
```

### Clear everything and start fresh
```bash
# Stop all containers
docker compose down -v

# Clean build artifacts
pnpm clean

# Reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Restart from Step 2
```

### Prisma issues
```bash
cd apps/api
npx prisma generate
npx prisma migrate reset  # WARNING: deletes all data
npx prisma db seed
```
