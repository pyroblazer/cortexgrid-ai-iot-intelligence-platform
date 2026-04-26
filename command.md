Act as a Principal Engineer and System Architect.

Design and implement a production-grade fullstack AI + IoT SaaS platform called:

"CortexGrid – AI-Powered IoT Intelligence Platform"

The system must reflect real-world enterprise architecture, prioritizing scalability, security, observability, and maintainability.

STRICT REQUIREMENTS:
- Use OPEN SOURCE technologies wherever possible
- DO NOT use paid services except Stripe (sandbox allowed)
- Follow industry best practices across architecture, testing, and DevOps
- Microfrontend, microservice architecture.
- Deployable easily to vercel, but if there's backend that's separated from the nextjs we can use docker

==================================================
1. MONOREPO & TOOLING
==================================================

- Use Turborepo for monorepo management

Structure:
- apps/web (Next.js frontend)
- apps/api (backend service)
- apps/iot-simulator
- packages/ui
- packages/config
- packages/types
- packages/eslint-config

Requirements:
- shared types across frontend/backend
- reusable UI components
- centralized config

==================================================
2. CORE STACK
==================================================

Frontend:
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

Backend:
- Node.js (NestJS)
- Typescript
- Prisma ORM
- PostgreSQL

Infra:
- Redis (cache + pub/sub)
- MQTT (Mosquitto)

==================================================
3. PRODUCT FEATURES
==================================================

CortexGrid must include:

- Multi-tenant SaaS system
- Organization & team management
- Role-Based Access Control (RBAC)
- IoT device management
- Real-time telemetry dashboard
- AI-powered insights
- Alerts & notifications
- Billing dashboard (Stripe-integrated)

==================================================
4. IOT ARCHITECTURE
==================================================

Protocol:
- MQTT (Mosquitto - open source)

Simulation:
- Build IoT simulator service:
  - emits telemetry periodically
  - configurable device profiles

Ingestion:
- backend subscribes to MQTT topics
- processes and stores telemetry

Optional integrations:
- ThingsBoard (open-source IoT platform)
- EMQX (alternative broker)

==================================================
5. AI ARCHITECTURE (OPEN SOURCE FIRST)
==================================================

Create AI abstraction layer:

Providers:
- Primary: Ollama (local LLM, open source)
- Secondary: HuggingFace Inference API (free tier)

Optional:
- OpenAI (only if needed, but not required)

Features:
- anomaly detection (statistical + AI explanation)
- natural language queries (“Ask your devices”)
- telemetry summarization

==================================================
6. BACKEND ARCHITECTURE
==================================================

Modular architecture:

Modules:
- Auth Module
- Organization Module
- Device Module
- Telemetry Module
- AI Module
- Billing Module
- Notification Module

Responsibilities:
- API layer (REST or GraphQL)
- IoT ingestion
- AI orchestration
- background jobs (BullMQ)
- webhook handling (Stripe)

==================================================
7. DATABASE DESIGN
==================================================

Primary:
- PostgreSQL

ORM:
- Prisma

Schema includes:
- users
- organizations
- memberships
- devices
- telemetry (time-series optimized)
- alerts
- usage_records
- subscriptions

Optional:
- TimescaleDB extension

==================================================
8. PAYMENT SYSTEM (STRICT RULE)
==================================================

DO NOT BUILD PAYMENT INFRASTRUCTURE.

Reason:
- PCI-DSS, ISO8583, ISO27001 complexity

USE:
- Stripe (sandbox)

Features:
- subscription plans
- usage-based billing
- webhook-driven updates

Backend must:
- handle Stripe webhooks
- sync subscription state
- enforce feature access

==================================================
9. SECURITY (BEST PRACTICES)
==================================================

Implement:

- JWT authentication (access + refresh tokens)
- RBAC per organization
- input validation (Zod)
- rate limiting
- secure headers (Helmet)
- CSRF protection
- HTTPS enforced

Secrets:
- environment variables only

==================================================
10. PERFORMANCE
==================================================

- SSR + SSG (Next.js)
- React Server Components
- streaming where applicable

Caching:
- Redis
- ISR (Incremental Static Regeneration)

==================================================
11. OBSERVABILITY (OPEN SOURCE STACK)
==================================================

Integrate:

- Prometheus (metrics)
- Grafana (dashboard)
- ELK stack (logging)

Track:
- API latency
- error rate
- device ingestion rate
- queue performance

==================================================
12. API DOCUMENTATION
==================================================

- Use Swagger (OpenAPI)
- Auto-generate API docs from backend
- Provide examples for all endpoints

==================================================
13. POSTMAN + NEWMAN
==================================================

- Create Postman collection:
  - auth
  - devices
  - telemetry
  - AI
  - billing

- Use Newman for CI:
  - run API tests automatically
  - validate responses

==================================================
14. TESTING (MANDATORY)
==================================================

Unit tests:
- services
- utilities

Integration tests:
- API + DB

E2E tests:
- Playwright (Chromium only)

STRICT:
- tests must run in parallel
- isolated test database per run
- mock external services (Stripe, AI)

==================================================
15. DEVOPS & CI/CD
==================================================

Docker:
- docker-compose for local dev

GitHub Actions pipeline:

Steps:
1. install dependencies
2. lint
3. type-check
4. unit tests
5. integration tests
6. Postman (Newman) tests
7. E2E tests (parallel)
8. build
9. deploy

==================================================
16. FRONTEND REQUIREMENTS
==================================================

Pages:
- Dashboard (charts + metrics)
- Devices
- Alerts
- Billing
- AI Assistant

Features:
- real-time updates (WebSocket/SSE)
- responsive UI
- accessible design

==================================================
17. BEST PRACTICES (ENFORCED)
==================================================

- Clean Architecture
- SOLID principles
- DRY / KISS
- proper error handling
- structured logging
- code linting + formatting
- strict typing (TypeScript)

==================================================
18. DOCUMENTATION
==================================================

Provide:

- Architecture diagram (PlantUML)
- API documentation (Swagger)
- Setup guide
- Environment variables
- Design decisions + tradeoffs

==================================================
19. OUTPUT REQUIREMENTS
==================================================

Must include:

- full monorepo structure
- key code implementations
- Docker setup
- CI/CD config
- sample API responses
- explanation of architectural decisions
- 70% coverage test passing
- How to make the structure as fast as possible through terminal commands guide within a guide.md file

The result must resemble a real enterprise-grade SaaS platform built by a senior/staff engineer.