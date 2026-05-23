# Docker Port Binding Incident Analysis & Resolution Guide

**Version:** 1.0  
**Date:** 2026-05-13  
**Severity:** HIGH (blocking local development)  
**Scope:** Cross-platform (Windows, Linux, macOS, WSL2, CI/CD)

---

## Executive Summary

**Problem:** Docker containers cannot bind to host port 3001, failing with "address already in use" even when no visible application holds the port.

**Root Cause:** Multi-factor (OS-specific and Docker-specific):
- Host OS port reservation (Windows Hyper-V, WSL2 dynamic range)
- Stale Docker container/network state
- Ghost processes from previous runs
- Incorrect port publishing configuration
- Network namespace conflicts

**Impact:** Blocks local development; affects CI/CD ephemeral environments

**Recommended Solution:** Replace fixed host port bindings with OS-agnostic dynamic port allocation + reverse proxy gateway pattern

**Timeline to Resolution:** 5-30 minutes (immediate) + architectural refactor (planned)

---

## 1. Root Cause Analysis

### 1.1 Why Docker Cannot Bind to Port 3001

Docker port binding involves a **three-layer interaction**:

```
Application (inside container) 
        ↓
Container Network Namespace (isolated)
        ↓
Host OS Network Stack (shared by all processes)
        ↓
Physical NIC / Loopback Interface
```

**The Problem:** When you request `docker compose up`, Docker tries to claim port 3001 on the **host** OS. If anything—visible or invisible—already has that port, the host OS refuses.

### 1.2 What "0.0.0.0:3001" Means

```
0.0.0.0:3001
├─ 0.0.0.0 = "all IPv4 interfaces on this host"
│           (includes 127.0.0.1, 192.168.x.x, eth0, etc)
│
└─ 3001 = port number
```

**Implication:** Publishing to `0.0.0.0:3001` reserves that port on **every** network interface. Even if one process only uses `127.0.0.1:3001`, Docker still can't claim `0.0.0.0:3001`.

### 1.3 Container Port vs Host Port

```yaml
ports:
  - "3001:3001"
   ↑       ↑
   |       └─ container port (inside container)
   └───────── host port (on your machine)
```

| Aspect | Container Port | Host Port |
|--------|---|---|
| **Scope** | Isolated to container | Shared by all processes on host |
| **Conflict** | Multiple containers can use same port | Only ONE listener allowed |
| **Visibility** | Only from other containers | From host + external network |
| **Risk** | Low | HIGH |

**Critical Insight:** You only need host port exposure if an **external application** (browser, curl, another service on host) needs to reach it. Internal container-to-container communication uses Docker's internal DNS (`api:3001`), requiring NO host port mapping.

### 1.4 How Docker Port Publishing Works Internally

```
Step 1: Docker reads ports: section
        ↓
Step 2: Docker creates iptables rules on host
        iptables -t nat -A DOCKER -p tcp -d 0.0.0.0 --dport 3001 \
          -j DNAT --to-destination 172.17.0.2:3001
        ↓
Step 3: Docker creates a veth pair (virtual ethernet)
        Host kernel sees: 0.0.0.0:3001 listener
        ↓
Step 4: Application inside container listens on 127.0.0.1:3001 (inside container)
        ↓
Step 5: Kernel routes: host:3001 → veth → container:3001
```

**If any step fails,** the whole chain breaks. Most commonly: Step 2 fails because host OS refuses to claim port 3001.

### 1.5 Why This Happens Even When Nothing Visible Uses the Port

**Root causes (in order of likelihood):**

#### A. OS-Level Port Reservation (Windows/WSL2)
```
Windows Hyper-V/WSL2 reserves dynamic port ranges:
  49152–65535 (default)
  BUT can expand to include 3001 under load
```

**Detection:**
```powershell
# Windows PowerShell
netsh int ipv4 show excludedportrange protocol=tcp
```

If output shows:
```
Start Port    End Port      
----------    --------      
     3001        3001       *
```
Then Windows has claimed the port.

#### B. Stale Docker Container Still Running
```bash
docker ps -a | grep -i "exited\|dead"
```

Even an exited container's network namespace can lock ports.

#### C. Previous Process Didn't Clean Up
```bash
# Linux/macOS
lsof -i :3001

# Windows PowerShell
Get-NetTCPConnection -LocalPort 3001
```

Returns a process PID that's **zombie** or **orphaned**.

#### D. Docker Daemon State Corruption
```bash
docker ps  # Shows nothing
# But Docker still thinks port is taken
```

#### E. WSL2 Kernel vs Windows Port Mapping
```
WSL2 runs a lightweight Hyper-V VM.
If port bound in WSL2 VM but process exited,
Windows host might still see port as taken.
```

#### F. Reverse Proxy / Load Balancer
```
Docker Desktop for Windows runs its own
DNS/proxy services on common ports
(3001 might be reserved for internal use)
```

---

## 2. OS-Agnostic Debugging

### 2.1 Windows (PowerShell)

```powershell
# ─────────────────────────────────────────────────
# 1. Check if Windows reserved the port
# ─────────────────────────────────────────────────
netsh int ipv4 show excludedportrange protocol=tcp

# Look for any range that includes 3001
# If 3001 is listed, that's your problem


# ─────────────────────────────────────────────────
# 2. Find process using port 3001
# ─────────────────────────────────────────────────
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | 
  Select-Object OwningProcess, State, LocalAddress, LocalPort

# Get process name
$pid = (Get-NetTCPConnection -LocalPort 3001).OwningProcess
Get-Process -Id $pid


# ─────────────────────────────────────────────────
# 3. Check Docker containers
# ─────────────────────────────────────────────────
docker ps -a

# Look for "Exited" or "Dead" containers
# Check logs of failed containers
docker logs <container-id>


# ─────────────────────────────────────────────────
# 4. Docker Desktop specific
# ─────────────────────────────────────────────────
# Check WSL2 VM networking
wsl.exe -d docker-desktop ip addr | grep -i "inet"

# Restart Docker Desktop (via GUI or CLI)
# Settings → Resources → Restart Docker Desktop


# ─────────────────────────────────────────────────
# 5. Force-free port (last resort)
# ─────────────────────────────────────────────────
Stop-Process -Id $pid -Force

# Or via netsh (TCP level reset)
netsh int tcp reset all
```

### 2.2 Linux/macOS (Bash/Zsh)

```bash
# ─────────────────────────────────────────────────
# 1. Find process using port 3001
# ─────────────────────────────────────────────────
lsof -i :3001

# Or more detailed
ss -tlnp | grep 3001        # Linux (ss = socket stats)
netstat -tlnp | grep 3001   # Older systems


# ─────────────────────────────────────────────────
# 2. Get details about the process
# ─────────────────────────────────────────────────
ps aux | grep <pid>


# ─────────────────────────────────────────────────
# 3. Docker specific
# ─────────────────────────────────────────────────
docker ps -a

# Check if Docker daemon sees orphaned containers
docker ps -a --filter "status=exited"

# Inspect network bridges
docker network ls
docker network inspect cortexgrid-network


# ─────────────────────────────────────────────────
# 4. macOS specific (if running Docker Desktop)
# ─────────────────────────────────────────────────
# Restart Docker daemon
sudo systemctl restart docker     # Linux
# or
killall -9 Docker                 # macOS


# ─────────────────────────────────────────────────
# 5. Force-free port
# ─────────────────────────────────────────────────
kill -9 <pid>

# Or find and kill all processes on port 3001
lsof -ti:3001 | xargs kill -9
```

### 2.3 WSL2 Specific

```bash
# ─────────────────────────────────────────────────
# 1. Check Windows host sees WSL2 port
# ─────────────────────────────────────────────────
# From PowerShell on Windows:
netsh interface portproxy show all

# Check if WSL2 localhost:3001 is proxied to Windows


# ─────────────────────────────────────────────────
# 2. Restart WSL2 VM
# ─────────────────────────────────────────────────
# From PowerShell:
wsl.exe --shutdown

# Restart by running any wsl command:
wsl.exe ls


# ─────────────────────────────────────────────────
# 3. Check Docker inside WSL2
# ─────────────────────────────────────────────────
wsl.exe -e docker ps -a
wsl.exe -e docker network ls


# ─────────────────────────────────────────────────
# 4. Reset WSL2 networking
# ─────────────────────────────────────────────────
# Warning: destructive

# Backup any critical data first
wsl.exe --unregister docker-desktop

# This removes the WSL2 distribution entirely
# Docker Desktop will recreate it on next restart
```

### 2.4 CI/CD Runners (GitHub Actions, GitLab CI, Jenkins)

```bash
# ─────────────────────────────────────────────────
# 1. Detect runner environment
# ─────────────────────────────────────────────────
if [[ -n "$GITHUB_ACTIONS" ]]; then
  echo "GitHub Actions runner"
elif [[ -n "$CI" ]]; then
  echo "Generic CI runner"
fi


# ─────────────────────────────────────────────────
# 2. Check available ports
# ─────────────────────────────────────────────────
# Port 3001 may be reserved for internal CI systems
# Test which ports are available:

for port in 3000 3001 3002 8000 8001 8080; do
  if ! nc -zv localhost $port 2>/dev/null; then
    echo "Port $port available"
  fi
done


# ─────────────────────────────────────────────────
# 3. Kill dangling processes from previous runs
# ─────────────────────────────────────────────────
docker system prune -af --volumes
docker container prune -f
docker network prune -f


# ─────────────────────────────────────────────────
# 4. Restart Docker daemon (if self-hosted)
# ─────────────────────────────────────────────────
sudo systemctl restart docker
```

### 2.5 Remote Dev Containers

```bash
# ─────────────────────────────────────────────────
# 1. Port forwarding issues
# ─────────────────────────────────────────────────
# If using SSH tunneling:
ssh -L 3001:localhost:3001 user@remote-host

# Check local port
lsof -i :3001

# Check remote port
ssh user@remote-host "lsof -i :3001"


# ─────────────────────────────────────────────────
# 2. Dev container host check
# ─────────────────────────────────────────────────
# From inside devcontainer:
docker ps  # should work
docker network ls


# ─────────────────────────────────────────────────
# 3. Host bridge issues
# ─────────────────────────────────────────────────
# Devcontainers use Docker sockets for communication
# Check Docker Desktop logging on host machine
```

---

## 3. Diagnostic Commands Matrix

| Task | Windows (PS) | Linux/macOS | WSL2 | CI/CD |
|------|---|---|---|---|
| **Find process on port** | `Get-NetTCPConnection -LocalPort 3001` | `lsof -i :3001` | `wsl lsof -i :3001` | `docker ps -a` |
| **Kill process** | `Stop-Process -Id $pid -Force` | `kill -9 $pid` | `wsl kill -9 $pid` | N/A |
| **List Docker containers** | `docker ps -a` | `docker ps -a` | `docker ps -a` | `docker ps -a` |
| **Check port reservations** | `netsh int ipv4 show excludedportrange` | `ss -tlnp \| grep 3001` | `wsl ss -tlnp` | Check CI logs |
| **Clean Docker state** | `docker system prune -af` | `docker system prune -af` | `docker system prune -af` | `docker system prune -af` |
| **Restart Docker** | GUI Settings → Restart | `sudo systemctl restart docker` | `wsl --shutdown` | N/A (ephemeral) |

---

## 4. Docker Compose Configuration Anti-Patterns

### 4.1 The Problem Pattern

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3001:3001"      # ❌ ANTI-PATTERN
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001  # ❌ HARDCODED
```

**Problems:**

1. **Port Contention:** Only one service per machine can use port 3001
2. **Not Composable:** Can't run multiple instances of this stack
3. **Hardcoded URLs:** Frontend assumes API on localhost:3001 (breaks in production)
4. **Not Cloud-Ready:** Kubernetes doesn't use fixed host ports
5. **Cross-Platform Issues:** Windows reserves ports differently than Linux

### 4.2 The `expose` Keyword (Underused)

```yaml
version: '3.8'
services:
  api:
    build: .
    expose:
      - "3001"           # ✅ INTERNAL ONLY (no host port)
    environment:
      - PORT=3001
```

**What it does:**
- Documents which ports the service uses
- Makes port available **only** to other containers (via Docker DNS)
- Does NOT expose to host OS
- Does NOT reserve OS-level resources

**When to use:**
- Internal service-to-service communication
- Services never accessed from host directly
- Default pattern for all microservices

### 4.3 When Host Port Mapping IS Needed

**Valid use cases:**
1. Browser needs to access frontend (localhost:3000)
2. External tool needs to debug via debugger port
3. Developer needs to curl API for testing
4. Public service (but then use reverse proxy, not fixed ports)

**Better pattern:**

```yaml
services:
  # Internal services (no host port)
  api:
    ports:
      - "3001:3001"      # Only if needed for local debugging
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001  # Internal networking

  # Service accessed by browser
  web:
    ports:
      - "${WEB_PORT:-3000}:3000"  # Dynamic from .env
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001
```

### 4.4 Port Publishing vs Internal Networking

```yaml
# ❌ DON'T DO THIS
services:
  api:
    ports:
      - "3001:3001"
  web:
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://localhost:3001  # Wrong! Won't work in container
```

```yaml
# ✅ DO THIS
services:
  api:
    expose:
      - "3001"
    environment:
      - PORT=3001
  
  web:
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://api:3001  # Uses Docker's internal DNS
```

**Why:** Docker has built-in DNS. Container `web` can reach `api` via hostname `api:3001` without exposing ports to host.

---

## 5. Production-Grade Fixes (Ranked)

### Ranking Criteria
- ✅ Cross-platform support
- ✅ Scalability
- ✅ Production-readiness
- ✅ Developer experience
- ✅ Security

---

### 5.1 **BEST: Internal-Only Docker Networking**

**Concept:** Remove all host port bindings except entry point (frontend/gateway).

```yaml
version: '3.8'

services:
  # Only web needs host exposure
  web:
    image: node:20
    ports:
      - "${WEB_PORT:-3000}:3000"  # Dynamic from .env
    environment:
      - NEXT_PUBLIC_API_URL=/api  # Proxy path, not URL!
      - API_INTERNAL_URL=http://api:3001
    depends_on:
      api:
        condition: service_healthy

  # API is internal-only
  api:
    image: node:20
    expose:
      - "3001"  # No host port!
    environment:
      - PORT=3001
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:16
    expose:
      - "5432"  # Internal only
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    expose:
      - "6379"  # Internal only

volumes:
  pgdata:
```

**Pros:**
- ✅ Zero port conflicts
- ✅ Works identically on all platforms
- ✅ Exactly matches Kubernetes behavior
- ✅ Composable (run multiple stacks)
- ✅ Production-ready
- ✅ No magic environment variables

**Cons:**
- ❌ Developers can't curl API directly (need reverse proxy)
- ❌ Must use reverse proxy for frontend→API communication

**Scalability:** ⭐⭐⭐⭐⭐ (unlimited)

---

### 5.2 **VERY GOOD: Reverse Proxy Gateway Pattern**

**Concept:** Single entry point (nginx/caddy) handles routing; all services internal-only.

```yaml
version: '3.8'

services:
  gateway:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - web
      - api

  web:
    image: node:20-alpine
    expose:
      - "3000"
    environment:
      - NEXT_PUBLIC_API_URL=/api  # Relative path!
      - API_INTERNAL_URL=http://api:3001

  api:
    image: node:20-alpine
    expose:
      - "3001"
    environment:
      - PORT=3001

volumes:
  pgdata:
```

**nginx.conf:**
```nginx
upstream web {
  server web:3000;
}

upstream api {
  server api:3001;
}

server {
  listen 80;
  
  location / {
    proxy_pass http://web;
  }
  
  location /api/ {
    proxy_pass http://api/;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

**Pros:**
- ✅ Single entry point
- ✅ Production-like setup
- ✅ TLS termination point
- ✅ Load balancing ready
- ✅ API path rewriting (no hardcoded URLs)
- ✅ Cross-platform

**Cons:**
- ❌ Additional container overhead
- ❌ Debugging requires understanding proxy rules
- ⚠️ Nginx configuration complexity

**Scalability:** ⭐⭐⭐⭐⭐ (production-grade)

---

### 5.3 **GOOD: Dynamic Host Ports from .env**

**Concept:** Port numbers from environment, allows customization.

```yaml
version: '3.8'

services:
  api:
    ports:
      - "${API_HOST_PORT:-3001}:3001"  # Falls back to 3001
  web:
    ports:
      - "${WEB_HOST_PORT:-3000}:3000"
```

**.env:**
```env
API_HOST_PORT=13001  # Avoid Windows-reserved range
WEB_HOST_PORT=13000
```

**Usage:**
```bash
# Use defaults
docker compose up

# Use custom ports
API_HOST_PORT=4001 WEB_HOST_PORT=4000 docker compose up
```

**Pros:**
- ✅ Flexible per-environment
- ✅ Easy to avoid conflicts
- ✅ Documented in .env

**Cons:**
- ❌ Developers still need to know correct ports
- ❌ Multiple stacks still conflict
- ❌ Not scalable to multiple instances
- ❌ Application still hardcodes URLs

**Scalability:** ⭐⭐ (only one stack at a time)

---

### 5.4 **ACCEPTABLE: Port Reservation Strategy**

**Concept:** Reserve specific port ranges per environment.

```
Development:     3000-3099  (localhost)
Testing:         4000-4099  (CI/CD)
Staging:         5000-5099  (internal network)
Production:      80, 443    (reverse proxy only)
```

**docker-compose.yml:**
```yaml
services:
  api:
    ports:
      - "3001:3001"  # Dev range
    environment:
      - NODE_ENV=development
```

**Pros:**
- ✅ Predictable
- ✅ Avoids "magic numbers"
- ✅ Documentation clear

**Cons:**
- ❌ Still doesn't solve port conflicts
- ❌ Fragile on shared machines
- ❌ Not cloud-native

**Scalability:** ⭐⭐ (requires manual coordination)

---

### 5.5 **NOT RECOMMENDED: Force-Free Ports (Destructive)**

```bash
# Windows
netsh int tcp reset all

# Linux (DANGEROUS)
sudo systemctl restart docker

# WSL2 (Destructive)
wsl --unregister docker-desktop
```

**Pros:**
- ✅ Immediate relief
- ✅ Works once

**Cons:**
- ❌ Destroys all running containers
- ❌ Loses uncommitted state
- ❌ WSL2 version loses all images
- ❌ Problem returns on next conflict
- ❌ Enterprise disaster

**Scalability:** ⭐ (not scalable)

---

### 5.6 **LEGACY: Devcontainer Approach**

**Concept:** Run entire stack inside VS Code devcontainer.

```json
.devcontainer/devcontainer.json
{
  "name": "CortexGrid",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  },
  "forwardPorts": [3000, 3001]
}
```

**Pros:**
- ✅ Isolated environment
- ✅ Consistent across team
- ✅ No local Docker Desktop needed

**Cons:**
- ❌ Slower on Windows (WSL2 overhead)
- ❌ Complex debugging setup
- ❌ Requires Docker outside of container (D-in-D anti-pattern)
- ❌ Not for teams

**Scalability:** ⭐ (single developer only)

---

## 6. Enterprise Architecture Recommendations

### 6.1 Monorepo Local Development

**Anti-Pattern:**
```yaml
# ❌ BAD: Hardcoded ports
services:
  web: { ports: ["3000:3000"] }
  api: { ports: ["3001:3001"] }
  admin: { ports: ["3002:3002"] }
  # Can only run ONE of each at a time!
```

**Best Practice:**
```yaml
# ✅ GOOD: Service discovery via DNS
services:
  web:
    expose: ["3000"]
    environment:
      API_URL: "http://api:3001"  # Internal DNS
      ADMIN_URL: "http://admin:3002"

  api:
    expose: ["3001"]

  admin:
    expose: ["3002"]

# Single entry point for browser
  gateway:
    image: nginx:latest
    ports:
      - "80:80"
    depends_on: [web, api, admin]
```

### 6.2 Shared Developer Environments

**Setup for team of 5+ developers:**

```yaml
# Base docker-compose.yml (shared infrastructure)
services:
  postgres:
    expose: ["5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    expose: ["6379"]

  # All services internal-only
  api:
    expose: ["3001"]
    environment:
      DATABASE_URL: "postgresql://postgres:5432/cortexgrid"
      REDIS_URL: "redis://redis:6379"

# docker-compose.override.yml (developer local)
services:
  gateway:
    image: nginx:latest
    ports:
      - "80:80"
    profiles: ["dev"]

# .env
API_HOST_PORT=3001
WEB_HOST_PORT=3000
```

**Usage:**
```bash
# Team member starts
pnpm run dev:full  # Uses docker-compose + override

# Internally:
# - Services communicate via DNS (http://api:3001)
# - Browser accesses via localhost:80 (gateway)
# - Zero port conflicts
```

### 6.3 Windows/WSL Interoperability

**WSL2 + Docker Desktop:**

```yaml
# docker-compose.yml (runs in WSL2)
services:
  api:
    expose: ["3001"]
    environment:
      # This works from BOTH Windows host and WSL2
      DATABASE_URL: "postgresql://postgres:5432/cortexgrid"
```

**Networking flow:**
```
Windows PowerShell curl localhost:80
    ↓
Docker Desktop (Windows host)
    ↓
nginx gateway container
    ↓
WSL2 Docker network
    ↓
api container (WSL2)
```

**Key:** Use gateway pattern; Docker Desktop bridges Windows→WSL2 automatically for exposed ports.

### 6.4 Remote Development Container Pattern

```dockerfile
# Dockerfile.devcontainer
FROM node:20

RUN apt-get update && apt-get install -y \
    docker.io \
    docker-compose

WORKDIR /workspace

# Mount Docker socket from host
# Mount workspace from host

# User can run docker commands
```

**docker-compose.devcontainer.yml:**
```yaml
services:
  devcontainer:
    build:
      context: .
      dockerfile: Dockerfile.devcontainer
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - .:/workspace

  # Same stack services
  postgres:
    expose: ["5432"]

  api:
    expose: ["3001"]
```

### 6.5 CI/CD Ephemeral Environments

```yaml
# docker-compose.ci.yml
version: '3.8'

services:
  # No host ports (CI runner has no "localhost" in traditional sense)
  api:
    expose: ["3001"]
    environment:
      - DATABASE_URL=postgresql://postgres:5432/test
      - NODE_ENV=test

  postgres:
    expose: ["5432"]
    environment:
      - POSTGRES_DB=test
      - POSTGRES_PASSWORD=testonly

  # Health checks before tests run
  test:
    image: node:20
    depends_on:
      postgres:
        condition: service_healthy
    command: pnpm test
```

**GitHub Actions:**
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - run: docker compose -f docker-compose.ci.yml up --abort-on-container-exit
```

---

## 7. Preventive Strategies

### 7.1 Recommended Compose Architecture

```
project/
├── docker-compose.yml               # Shared infra + services (internal-only)
├── docker-compose.override.yml      # Local dev gateway + ports
├── docker-compose.prod.yml          # Production (Kubernetes-ready)
├── .env                             # Environment variables
├── .env.example                     # Documentation
│
├── infra/
│   ├── nginx.conf                   # Gateway configuration
│   ├── postgres/
│   │   └── init.sql
│   ├── redis/
│   │   └── redis.conf
│   └── monitoring/
│       ├── prometheus.yml
│       └── grafana.yml
│
└── scripts/
    ├── dev.mjs                      # Orchestrated startup
    ├── health-check.sh              # Readiness probes
    └── cleanup.sh                   # Safe shutdown
```

### 7.2 Port Allocation Matrix

```
Category          | Local Dev | Testing | Staging | Prod  | Notes
────────────────────────────────────────────────────────────────
Web (frontend)    | 3000      | 4000    | -       | 80    | Browser entry
API Gateway       | 80        | 8080    | -       | 80    | Reverse proxy
API Service       | 3001      | 3001    | -       | -     | Internal only
PostgreSQL        | 5432      | 5433    | -       | -     | Internal only
Redis             | 6379      | 6380    | -       | -     | Internal only
Elasticsearch     | 9200      | 9201    | -       | -     | Internal only
Prometheus        | 9090      | 9091    | -       | -     | Internal only
```

**Rules:**
1. Production: Only ports 80, 443 exposed (reverse proxy)
2. Staging: No host exposure (load balancer handles)
3. Local dev: Use gateway on port 80 or 8000
4. CI/CD: All internal (no host ports)

### 7.3 Naming Conventions

```yaml
# Service names (DNS-compatible)
services:
  web:              # Frontend (clear purpose)
  api:              # Backend API
  auth-service:     # Auth microservice
  notification-worker: # Background job

# Volume names (descriptive)
volumes:
  postgres_data:    # Clearly database
  redis_cache:      # Clearly cache
  elasticsearch_index: # Clearly search

# Network names (optional but clear)
networks:
  frontend:         # Web tier
  backend:          # Services tier
  data:             # Data tier
```

### 7.4 Health Check Best Practices

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s    # Time to startup before checks begin
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

### 7.5 Startup Ordering (depends_on with conditions)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      retries: 5

  api:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    # Startup guaranteed AFTER postgres + redis are ready
```

---

## 8. Implementation Examples

### 8.1 Improved docker-compose.yml (Current Project)

```yaml
version: '3.8'

services:
  # ─────────────────────────────────────────────────────────
  # Entry point: Reverse proxy gateway
  # ─────────────────────────────────────────────────────────
  gateway:
    image: nginx:1.25-alpine
    container_name: cortexgrid-gateway
    ports:
      - "${GATEWAY_PORT:-80}:80"
    volumes:
      - ./infra/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      web:
        condition: service_started
      api:
        condition: service_healthy
    networks:
      - cortexgrid
    profiles:
      - dev           # Only in development

  # ─────────────────────────────────────────────────────────
  # Frontend (web)
  # ─────────────────────────────────────────────────────────
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile.dev
    container_name: cortexgrid-web-dev
    restart: "no"
    expose:                   # ✅ Internal only
      - "3000"
    volumes:
      - ./apps/web/src:/app/apps/web/src:ro
      - ./apps/web/public:/app/apps/web/public:ro
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=/api    # ✅ Relative path
      - API_INTERNAL_URL=http://api:3001
    networks:
      - cortexgrid
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 3

  # ─────────────────────────────────────────────────────────
  # Backend API
  # ─────────────────────────────────────────────────────────
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile.dev
    container_name: cortexgrid-api-dev
    restart: "no"
    expose:                   # ✅ Internal only
      - "3001"
    volumes:
      - ./apps/api/src:/app/apps/api/src:ro
      - ./apps/api/prisma:/app/apps/api/prisma:ro
    environment:
      - NODE_ENV=development
      - PORT=3001
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      mosquitto:
        condition: service_healthy
    networks:
      - cortexgrid
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # ─────────────────────────────────────────────────────────
  # IoT Simulator
  # ─────────────────────────────────────────────────────────
  iot-simulator:
    build:
      context: .
      dockerfile: apps/iot-simulator/Dockerfile.dev
    container_name: cortexgrid-iot-simulator-dev
    restart: "no"
    expose:
      - "3002"
    environment:
      - NODE_ENV=development
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
    depends_on:
      mosquitto:
        condition: service_healthy
    networks:
      - cortexgrid

  # ─────────────────────────────────────────────────────────
  # Infrastructure: PostgreSQL
  # ─────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: cortexgrid-postgres
    restart: "no"
    expose:                   # ✅ Internal only
      - "5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      - POSTGRES_USER=${DB_USER:-cortexgrid}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-cortexgrid}
      - POSTGRES_DB=${DB_NAME:-cortexgrid}
    networks:
      - cortexgrid
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-cortexgrid}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ─────────────────────────────────────────────────────────
  # Infrastructure: Redis
  # ─────────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: cortexgrid-redis
    restart: "no"
    expose:
      - "6379"
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data
    networks:
      - cortexgrid
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─────────────────────────────────────────────────────────
  # Infrastructure: MQTT Broker
  # ─────────────────────────────────────────────────────────
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: cortexgrid-mosquitto
    restart: "no"
    expose:
      - "1883"
      - "9001"
    volumes:
      - mosquittolog:/mosquitto/log
      - mosquittodata:/mosquitto/data
      - ./infra/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    networks:
      - cortexgrid
    healthcheck:
      test: ["CMD", "mosquitto_sub", "-h", "localhost", "-t", "test", "-W", "1"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─────────────────────────────────────────────────────────
  # Observability: Elasticsearch
  # ─────────────────────────────────────────────────────────
  elasticsearch:
    image: elasticsearch:8.12.0
    container_name: cortexgrid-elasticsearch
    restart: "no"
    expose:
      - "9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - esdata:/usr/share/elasticsearch/data
    networks:
      - cortexgrid
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ─────────────────────────────────────────────────────────
  # Observability: Prometheus
  # ─────────────────────────────────────────────────────────
  prometheus:
    image: prom/prometheus:latest
    container_name: cortexgrid-prometheus
    restart: "no"
    expose:
      - "9090"
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheusdata:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - cortexgrid

volumes:
  pgdata:
  redisdata:
  mosquittolog:
  mosquittodata:
  esdata:
  prometheusdata:

networks:
  cortexgrid:
    driver: bridge
```

### 8.2 Nginx Reverse Proxy Configuration

**infra/nginx.conf:**

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Upstream definitions (service discovery via Docker DNS)
    upstream web_backend {
        server web:3000;
    }

    upstream api_backend {
        server api:3001;
    }

    # HTTP to HTTPS redirect (if using SSL)
    # server {
    #     listen 80;
    #     server_name _;
    #     return 301 https://$host$request_uri;
    # }

    # Main server block
    server {
        listen 80;
        server_name localhost;
        client_max_body_size 100M;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }

        # API routes
        location /api/ {
            proxy_pass http://api_backend/;
            
            # Important headers for proper routing
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $server_name;

            # WebSocket support (if needed)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Frontend (catch-all)
        location / {
            proxy_pass http://web_backend;
            
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # SPA routing (send 404s back to index.html)
            error_page 404 =200 /index.html;
        }
    }
}
```

### 8.3 Environment Configuration

**.env:**
```env
# ─────────────────────────────────────────────────────────
# Infrastructure
# ─────────────────────────────────────────────────────────
DB_USER=cortexgrid
DB_PASSWORD=cortexgrid-dev-only
DB_NAME=cortexgrid

# ─────────────────────────────────────────────────────────
# Local Development Port (gateway only)
# ─────────────────────────────────────────────────────────
GATEWAY_PORT=80

# ─────────────────────────────────────────────────────────
# Internal URLs (never hardcoded in code)
# ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql://cortexgrid:cortexgrid-dev-only@postgres:5432/cortexgrid
REDIS_URL=redis://redis:6379
MQTT_BROKER_URL=mqtt://mosquitto:1883

# ─────────────────────────────────────────────────────────
# Application
# ─────────────────────────────────────────────────────────
NODE_ENV=development
LOG_LEVEL=debug
```

**.env.example:**
```env
# Copy to .env and update values
# DO NOT commit .env to git

# Database
DB_USER=cortexgrid
DB_PASSWORD=choose-a-secure-password
DB_NAME=cortexgrid

# Gateway port (change if 80 is already in use)
GATEWAY_PORT=80

# Or use higher port to avoid sudo on Linux
GATEWAY_PORT=8000
```

### 8.4 Startup Script (scripts/dev.mjs)

*Already provided in earlier section of this document*

---

## 9. Troubleshooting Decision Tree

```
Docker container won't start
│
├─ "port already in use" error?
│  │
│  ├─ Yes, Windows?
│  │  └─ Run: netsh int ipv4 show excludedportrange protocol=tcp
│  │     - If port listed → Windows reserved it
│  │     - Run: scripts/dev.mjs (uses dynamic ports)
│  │
│  ├─ Yes, Linux/macOS?
│  │  └─ Run: lsof -i :3001
│  │     - Returns PID? → kill -9 <pid>
│  │     - No output? → Docker state corruption
│  │       - Run: docker system prune -af --volumes
│  │
│  └─ Yes, CI/CD runner?
│     └─ Run: docker system prune -af
│        └─ Retry build
│
├─ Container exited with error?
│  │
│  ├─ Check logs: docker logs <container-id>
│  │
│  └─ Application startup issues?
│     └─ Check healthcheck: docker inspect <container-id>
│
└─ Network connectivity issues?
   │
   ├─ Container can't reach database?
   │  └─ Check: docker network inspect cortexgrid
   │           Verify service names resolve
   │
   └─ Browser can't reach localhost:80?
      └─ Check: curl localhost:80
         └─ If refused → gateway service not started
            - Run: docker compose up gateway
```

---

## 10. Summary Table: Quick Reference

| Issue | Command (Windows PS) | Command (Linux/macOS) | Solution |
|-------|---|---|---|
| Port already in use | `Get-NetTCPConnection -LocalPort 3001` | `lsof -i :3001` | Use scripts/dev.mjs (dynamic ports) |
| Can't find process | Check Docker containers | `docker ps -a` | Stop exited containers |
| Docker daemon hung | Restart from Settings | `systemctl restart docker` | Restart gateway + services |
| WSL2 issues | `wsl --shutdown` | N/A | Restart WSL2 VM |
| Multiple stacks conflict | Use docker-compose.override.yml | Same | Internal networking + gateway |
| CI/CD ephemeral | Use docker-compose.ci.yml | Same | No host ports |
| Production deployment | Kubernetes/Docker Swarm | Same | No fixed host ports |

---

## Conclusion

**The root cause** of port binding failures is fundamental: operating systems limit who can listen on network ports. Docker attempts to claim a host port on behalf of a container, but if the OS (or a previous process) holds that port, Docker fails.

**The solution** isn't to fight the OS—it's to change your architecture to **not require fixed host ports** for internal services.

**Best practice hierarchy:**
1. ✅ Internal Docker networking + gateway pattern (production-ready)
2. ✅ Dynamic ports from environment (local development)
3. ✅ Port reservation strategy (documentation-heavy)
4. ❌ Fixed port bindings (problem source)
5. ❌ Force-freeing ports (destructive)

**This guide provides production-grade** troubleshooting, architecture improvements, and cross-platform commands.

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-13  
**Maintainer:** Platform Engineering Team
