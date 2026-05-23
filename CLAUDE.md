# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**All commands run from root directory.**

### Development

```bash
# Automatic startup (handles port cleanup on Windows/macOS/Linux)
pnpm run dev:full

# Alternative: Manual startup
pnpm install
docker compose up --build &
pnpm dev
```

Opens frontend at `http://localhost:3000` (demo@cortexgrid.io / Demo@1234)

### Testing

```bash
# All tests
pnpm test

# By type (unit, integration, E2E)
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Single test file (from app directory)
cd apps/api
pnpm test:integration -- auth.integration.spec.ts --runInBand --forceExit

# Coverage report
pnpm --filter @cortexgrid/api test:cov
```

### Code Quality

```bash
pnpm lint          # ESLint all packages
pnpm type-check    # TypeScript strict mode
pnpm format        # Prettier formatting
```

### Database

```bash
# API app auto-runs on startup, but manual control:
cd apps/api
pnpm db:generate   # Regenerate Prisma client (after schema changes)
pnpm db:migrate    # Apply pending migrations
pnpm db:seed       # Load demo data
pnpm db:studio     # Open Prisma Studio (visual DB browser)
```

### Infrastructure

```bash
pnpm docker:infra  # Start only PostgreSQL, Redis, Mosquitto, Elasticsearch
pnpm docker:dev    # Start with development services (Grafana, Prometheus)
pnpm docker:prod   # Production-like setup
pnpm docker:down   # Stop all containers
```

---

## Architecture Overview

### Monorepo Structure

```
cortexgrid (Turborepo + pnpm workspaces)
│
├── apps/
│   ├── api/              # NestJS backend (port 3001)
│   │   ├── src/modules/  # Feature modules (auth, device, telemetry, ai, alert, etc)
│   │   ├── prisma/       # Database schema + migrations
│   │   ├── test/         # E2E tests (supertest)
│   │   └── jest.*.config # Unit + integration test configs
│   │
│   ├── web/              # Next.js 14 frontend (port 3000)
│   │   ├── src/app/      # Next.js App Router (auth pages + dashboard)
│   │   ├── src/components/  # React components
│   │   ├── src/hooks/    # Custom hooks (useTelemetry WebSocket, useAuth)
│   │   ├── src/stores/   # Zustand state (auth, devices)
│   │   └── e2e/          # Playwright E2E tests
│   │
│   └── iot-simulator/    # IoT device MQTT publisher
│       └── src/devices/  # 6 device profiles (temp, humidity, pressure, etc)
│
├── packages/
│   ├── types/            # Shared TypeScript types (auth, device, telemetry DTOs)
│   ├── ui/               # Reusable React components (Button, Card, Modal, etc)
│   ├── config/           # Shared constants (plan limits, MQTT topics, Redis keys)
│   └── eslint-config/    # Shared ESLint rules
│
└── docker/               # Infra configurations
    ├── api-entrypoint.sh # API startup (migrate + seed + serve)
    ├── prometheus/       # Metrics scrape config
    ├── grafana/          # Pre-built dashboards
    ├── mosquitto/        # MQTT broker config
    └── postman/          # API tests + environment
```

### Backend Architecture (NestJS)

**Module Structure:** Each module owns its domain (auth, device, telemetry, etc)

```
apps/api/src/
├── main.ts                 # Bootstrap: Helmet, CORS, Swagger, rate limiting
├── app.module.ts           # Root module + all feature imports
│
├── common/                 # Shared infrastructure
│   ├── guards/             # JWT auth + RBAC role guards
│   ├── interceptors/       # Response transform + request logging + audit
│   ├── filters/            # Global exception handler
│   ├── decorators/         # @CurrentUser, @Roles, @Public, @ApiPaginated
│   ├── prisma/             # PrismaClient lifecycle management
│   ├── redis/              # ioredis wrapper (get/set/pub/sub)
│   └── queue/              # BullMQ job processors
│
└── modules/
    ├── auth/               # Registration, login, JWT, refresh tokens, GDPR export/delete
    ├── organization/       # Org CRUD, memberships, invitations, plan limits
    ├── device/             # Device CRUD, status tracking, metrics
    ├── telemetry/          # MQTT ingestion + WebSocket gateway + Redis cache
    ├── ai/                 # Ollama NL queries + anomaly detection + summaries
    ├── alert/              # Alert rules + evaluation engine + lifecycle
    ├── billing/            # Stripe checkout + webhooks + plan enforcement
    ├── notification/       # In-app notifications + email
    ├── audit/              # Audit log persistence + querying
    └── health/             # DB + Redis + MQTT health checks
```

**Key Patterns:**
- **Guards**: Protect endpoints with `@UseGuards(JwtAuthGuard)` + `@Roles(Role.ADMIN)` decorator
- **Decorators**: Use `@CurrentUser()` to inject authenticated user, `@Public()` to skip auth
- **Services**: Business logic (external deps: DB, Redis, MQTT clients via constructor injection)
- **DTOs**: Class-validator for input validation (auto stripped + forbidden fields rejected)
- **Database**: Prisma ORM with organization-scoped queries (all `where: { organizationId }`)

### Frontend Architecture (Next.js + React)

**App Router Structure:**
```
src/app/
├── (auth)/           # Public routes (login, register)
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── (dashboard)/      # Protected routes (require auth)
│   ├── layout.tsx    # Sidebar + topbar
│   ├── page.tsx      # Dashboard overview
│   ├── devices/      # Device management
│   ├── alerts/       # Alert rules + history
│   ├── ai/           # NL query + anomaly detection
│   ├── billing/      # Subscription + checkout
│   └── settings/     # User + org settings
```

**State Management:**
- **Zustand stores** (`src/stores/`): Auth token + current user, selected organization
- **React Query** (TanStack): Server state (devices list, telemetry, alerts—handles caching + refetch)
- **WebSocket** (`useTelemetry` hook): Real-time telemetry updates via Socket.io

**UI Components:**
- Shadcn-style components in `packages/ui/`
- Tailwind CSS for styling
- Lucide icons
- Recharts for time-series visualizations

---

## Key Technical Decisions

### Why Turborepo + pnpm?

- **Cached builds**: Turbo's task cache avoids rebuilding unchanged packages
- **Shared types**: `packages/types` imported across frontend/backend (single source of truth)
- **pnpm workspaces**: Symlinks packages (fast, reduces disk usage)
- **Filtered commands**: `pnpm --filter @cortexgrid/api test` runs only API tests

**Implication:** Modifying shared types invalidates caches for dependent apps. Turbo will automatically rebuild affected packages on next `pnpm build` / `pnpm test`.

### Why NestJS?

- Modular architecture (feature modules + decorators match DDD)
- Built-in dependency injection
- Swagger/OpenAPI auto-generation
- Integrated validation pipeline + exception filters
- Mature ecosystem (BullMQ, Passport, TypeORM/Prisma integrations)

**Pattern:** Each module has `.service.ts` (business logic) + `.controller.ts` (HTTP routes). Services are singletons (Nest creates once at startup).

### Why PostgreSQL + Prisma?

- Relational integrity: Foreign keys + constraints enforce data consistency
- ACID transactions: Multi-step billing operations (charge → update plan → notify)
- Prisma ORM: Type-safe queries, auto-migrations, schema-as-code
- Audit trail: All mutations logged (who, what, when) in audit table

**Pattern:** Organization-scoped queries in every `.service.ts`:
```typescript
// Bad: could leak another org's data
const devices = await this.db.device.findMany()

// Good: scoped to current organization
const devices = await this.db.device.findMany({ 
  where: { organizationId: user.organizationId } 
})
```

### Why MQTT for IoT?

- Binary protocol (vs HTTP text)
- QoS levels (guaranteed delivery)
- Last-will (device status tracking)
- Pub/sub (fan-out to multiple subscribers)
- Lightweight (sensors with limited bandwidth)

**Implication:** Ingest path is async (MQTT → server → Redis cache → WebSocket push). Use `GET /telemetry/latest` for instant reads (cached in Redis).

### Why Ollama (not OpenAI)?

- Zero API cost (runs locally in container)
- Data privacy (stays on-prem)
- No rate limits
- Graceful fallback to stats when unavailable (AI module checks Ollama health)

**Implication:** NL queries are slow (~1-2s) but free. Stats-based summaries are instant fallback.

### Why Redis for Cache?

- Sub-millisecond reads (latest telemetry)
- Pub/Sub for WebSocket push (devices publish → API subscribes → broadcast to clients)
- TTL for automatic cleanup (old telemetry auto-expires)

**Pattern:** Redis keys are namespaced by organization (`telemetry:{orgId}:{deviceId}:latest`). Avoids cross-org data leaks.

### Why BullMQ for Background Jobs?

- Reliable job processing (persisted in Redis)
- Retries + exponential backoff
- Job priorities (billing charges > alerts > telemetry aggregation)
- Deduplication (prevents duplicate alert notifications)

**Processors:** Located in `src/common/queue/processors/`. Each handles one job type (retention cleanup, alert evaluation, Stripe webhook handling).

---

## Testing Strategy

### Test Naming Conventions

- `*.unit.spec.ts`: Service logic (no DB, mocked external deps)
- `*.integration.spec.ts`: Full module (real DB, real Redis, real MQTT)
- `*.e2e.spec.ts` or `/test/`: Full API stack (bootstrap NestJS app, real HTTP)

### Running Tests

```bash
# All tests (runs in sequence: unit → integration → E2E)
pnpm test

# Specific suite
cd apps/api
pnpm test:unit
pnpm test:integration --testPathPattern=device    # Only device tests
pnpm test:e2e -- auth.e2e-spec.ts                 # Only auth E2E
```

**Important:** Integration tests require Docker containers running. If you get DB connection errors:
```bash
docker compose up -d postgres redis mosquitto
# Wait for healthchecks to pass
docker compose ps
```

### Integration Test Structure

```typescript
// apps/api/test/device.integration.spec.ts
describe('DeviceService (integration)', () => {
  let app: INestApplication;
  let db: PrismaClient;

  beforeAll(async () => {
    // Start real NestJS app + real DB
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    db = moduleFixture.get(PrismaClient);
    await app.init();
  });

  it('should list devices scoped to organization', async () => {
    // Real database transaction
    const org = await db.organization.create({ data: {...} });
    const device = await db.device.create({ 
      data: { organizationId: org.id, ... } 
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toContainEqual(device);
  });
});
```

### E2E API Tests

```bash
cd apps/api
pnpm test:e2e
```

These bootstrap the full NestJS app + all modules. Slower but catch integration issues.

### Frontend E2E Tests (Playwright)

```bash
cd apps/web
pnpm test:e2e      # Headless
pnpm test:e2e --ui # Interactive mode (great for debugging)
```

Tests real Next.js app + real backend (must be running).

---

## Turborepo Build System

### Task Dependency Graph

```
build (build all packages)
├── packages/config:build (no deps)
├── packages/types:build (no deps)
├── packages/ui:build (depends on ^build = packages:build)
├── packages/eslint-config:build (no deps)
├── apps/api:build (depends on ^build = packages:build)
│   └── runs `nest build`
└── apps/web:build (depends on ^build = packages:build)
    └── runs `next build`

lint (runs ESLint)
├── api:lint (depends on ^build)
└── web:lint (depends on ^build)

test (runs all Jest tests)
├── api:test (depends on ^build)
└── web:test (depends on ^build)
```

### Cache Behavior

- **Cached tasks**: build, lint, type-check, test
- **Non-cached**: dev, db:generate, db:migrate, db:seed, clean
- **Cache key**: Task inputs (source files) + environment

**Invalidation:** Changing any source file in a package invalidates that package's cache. Turbo rebuilds only affected packages.

**To bypass cache:**
```bash
pnpm build --no-cache
pnpm test --no-cache
```

### Filtered Execution

```bash
# Only API tests
pnpm --filter @cortexgrid/api test

# Only web + shared dependencies
pnpm --filter @cortexgrid/web... lint

# All packages that depend on 'types'
pnpm --filter "@cortexgrid/types..." build
```

---

## Database Schema & Migrations

**Location:** `apps/api/prisma/schema.prisma`

**Key Models:**
- `User`: Login + profile (email, password hash, GDPR export)
- `Organization`: Multi-tenant container (one org = one customer)
- `Membership`: User's role in org (OWNER, ADMIN, MEMBER, VIEWER)
- `Device`: IoT sensors + actuators (metadata + metrics)
- `Telemetry`: Time-series readings (organized + metrics)
- `Alert`: Alert rules + current state
- `Subscription`: Stripe subscription + plan
- `AuditLog`: All mutations (who, what, when)

**Schema Key Features:**
- `organizationId` on all user-visible entities (scoping)
- `createdAt / updatedAt` on all models (audit trail)
- Foreign keys with `onDelete: Cascade` (cleanup on org delete)
- Enums for Status, Role, Severity, PlanType

**To Apply Schema Changes:**
```bash
cd apps/api

# Create migration
pnpm db:migrate
# → Prompts for migration name
# → Generates migration file in prisma/migrations/

# Regenerate Prisma client (required after schema changes)
pnpm db:generate

# Rebuild app (schema changes affect generated types)
pnpm build
```

---

## Critical Files & Patterns

### Authentication Flow

1. **Register**: `POST /api/v1/auth/register` → creates user + organization
2. **Login**: `POST /api/v1/auth/login` → returns `{ accessToken, refreshToken }`
3. **Refresh**: `POST /api/v1/auth/refresh` → returns new `accessToken` (refresh token stored in Redis)
4. **Protected routes**: `@UseGuards(JwtAuthGuard)` → verifies JWT signature
5. **RBAC**: `@Roles(Role.ADMIN)` → checks user's role in current org

**JWT Strategy:** Located in `src/modules/auth/strategies/jwt.strategy.ts`
- Extracts token from `Authorization: Bearer <token>` header
- Verifies signature using `JWT_SECRET` env var
- Decorates request with `user` object (id, email, organizationId, roles)

### WebSocket Real-Time Telemetry

**Gateway:** `src/modules/telemetry/gateway/telemetry.gateway.ts`
- Connects via Socket.io (not raw WebSocket)
- Authenticates using JWT from query param or cookie
- Subscribes to Redis pub/sub on connect: `telemetry:{organizationId}:*`
- Broadcasts to all connected clients in org when device publishes data

**Client Hook** (`packages/ui` or `src/hooks/useTelemetry.ts`):
```typescript
const useTelemetry = () => {
  useEffect(() => {
    const socket = io('http://localhost:3001', {
      auth: { token: accessToken }
    });
    
    socket.on('telemetry:update', (data) => {
      // Update local state
    });
    
    return () => socket.disconnect();
  }, []);
};
```

### Device Plan Limit Enforcement

**Location:** `src/modules/device/device.service.ts:create()`
- Checks org's subscription plan (FREE, PRO, ENTERPRISE)
- Looks up plan limits from `packages/config/plan-limits.ts`
- Prevents device creation if limit exceeded

**Implication:** Adding a device to FREE plan (max 5) fails with 403 (upgrade to PRO).

### Alert Evaluation Engine

**Processor:** `src/common/queue/processors/alert-evaluation.processor.ts`
- Runs on BullMQ job (enqueued every 5 min by scheduler)
- For each active alert rule: fetches latest telemetry, evaluates condition
- If condition met: creates alert instance, notifies user
- Deduplicates (doesn't re-alert if already notified in last hour)

**Implication:** Alerts are checked periodically, not on every telemetry event. Real-time feel comes from WebSocket push of latest data; alert evaluation catches missing thresholds.

### GDPR Compliance Endpoints

1. **Export user data**: `GET /api/v1/auth/me/export` → JSON file with all personal data
2. **Delete account**: `DELETE /api/v1/auth/me` → soft-deletes user, cascades to org if sole owner
3. **Data retention**: BullMQ processor (`retention.processor.ts`) cleans up old telemetry based on org retention policy

---

## Environment Variables

**Required for development** (copy `apps/api/.env.example`):

```env
# Database
DATABASE_URL=postgresql://cortexgrid:cortexgrid@localhost:5432/cortexgrid

# Redis
REDIS_URL=redis://localhost:6379

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=another-secret-key

# Stripe (test keys from stripe.com/docs)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Ollama (optional for AI features)
OLLAMA_BASE_URL=http://localhost:11434

# Frontend API URL (for Next.js)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Important:** 
- Never commit `.env` (add to `.gitignore`)
- Use `.env.example` as template for team
- Docker Compose reads from `.env` at root

---

## Common Development Tasks

### Adding a New API Endpoint

1. **Create DTO** in `src/modules/feature/dto/`
   ```typescript
   export class CreateFooDto {
     @IsString() @MinLength(1) name: string;
   }
   ```

2. **Add controller method** in `src/modules/feature/feature.controller.ts`
   ```typescript
   @Post() 
   @UseGuards(JwtAuthGuard)
   @Roles(Role.MEMBER)
   create(@CurrentUser() user: User, @Body() dto: CreateFooDto) {
     return this.service.create(user.organizationId, dto);
   }
   ```

3. **Add service method** in `src/modules/feature/feature.service.ts`
   ```typescript
   create(organizationId: string, dto: CreateFooDto) {
     return this.db.foo.create({
       data: { ...dto, organizationId } // ← Always scope!
     });
   }
   ```

4. **Test it**
   ```bash
   pnpm test:integration -- feature.integration.spec.ts --runInBand
   ```

5. **Swagger docs auto-update** (restart API to see at `/api/docs`)

### Adding a Background Job

1. **Create processor** in `src/common/queue/processors/my-job.processor.ts`
   ```typescript
   @Processor('my-job-queue')
   export class MyJobProcessor {
     process(job: Job<MyJobData>) {
       // Do work
     }
   }
   ```

2. **Enqueue job** from service
   ```typescript
   await this.queue.add('my-job', { organizationId, ... }, { 
     delay: 5000 // run in 5 seconds
   });
   ```

3. **Register processor** in `app.module.ts`

### Debugging Integration Tests

```bash
cd apps/api

# Run single test with full output
pnpm test:integration -- device.integration.spec.ts --runInBand --verbose

# Debug in Node inspector
node --inspect-brk node_modules/.bin/jest --config jest.integration.config.ts device.integration.spec.ts
```

Then open `chrome://inspect` to debug in Chrome DevTools.

### Checking API Documentation

When backend is running:
```
http://localhost:3001/api/v1/docs
```

Auto-generated from `@ApiOperation`, `@ApiResponse` decorators. Update decorators → restart API → docs refresh.

---

## Performance & Optimization

### Redis Caching

- **Latest telemetry**: Cached for 1 minute (sub-millisecond reads)
- **Device list**: NOT cached (must hit DB for accurate plan limits)
- **User session**: Redis stores refresh tokens (instant revocation on logout)

**Pattern:** Check cache first, fall back to DB:
```typescript
const cached = await this.redis.get(`telemetry:${deviceId}:latest`);
if (cached) return JSON.parse(cached);

const fresh = await this.db.telemetry.findFirst({ ... });
await this.redis.setex(`telemetry:${deviceId}:latest`, 60, JSON.stringify(fresh));
return fresh;
```

### Turbo Build Caching

- Full build (cold): ~30s
- Incremental (hot cache): ~2s
- Cache invalidation on source change

**Tip:** If tests fail despite code looking correct, clear cache:
```bash
pnpm clean && pnpm install && pnpm build
```

### Database Query Optimization

- Use `.select()` to fetch only needed fields (large telemetry docs waste memory)
- Use `.take(n)` for pagination (avoid full table scans)
- Indexes on `organizationId` + frequently filtered columns

---

## Troubleshooting

### Docker Port Conflicts

**Symptoms:** `docker: Error response from daemon: Ports are not available`

**Solution:** Use automated startup script
```bash
pnpm run dev:full
```

This automatically:
1. Detects and frees ports 3000, 3001
2. Cleans up stale containers
3. Starts fresh Docker stack

See `docs/docker-port-binding-incident-analysis.md` for detailed explanation.

### Database Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Check:**
```bash
docker compose ps postgres   # Is it running?
docker compose logs postgres # Any errors?
docker compose restart postgres
```

### MQTT Connection Issues

```
Error: Connection refused on mqtt://localhost:1883
```

**Check:**
```bash
docker compose ps mosquitto
docker compose logs mosquitto
```

### Tests Hang or Timeout

**Common cause:** Integration tests waiting for Docker container startup

**Solution:**
```bash
# Ensure containers are healthy before running tests
docker compose ps
# Look for "healthy" status on all services

# If not healthy, restart
docker compose restart
docker compose logs # check for startup errors
```

### Type Errors After Schema Change

**After editing `prisma/schema.prisma`:**

1. Generate Prisma client
   ```bash
   cd apps/api
   pnpm db:generate
   ```

2. Rebuild all packages (invalidates cache)
   ```bash
   pnpm build --no-cache
   ```

3. Tests should now pass

---

## References

- **Architecture decisions**: `docs/design-decisions.md`
- **Setup instructions**: `docs/setup-guide.md` or `guide.md`
- **API docs (runtime)**: http://localhost:3001/api/v1/docs
- **Compliance mappings**: `README.md` (ISO27001, GDPR, SOC2)
- **Port binding incidents**: `docs/docker-port-binding-incident-analysis.md`
