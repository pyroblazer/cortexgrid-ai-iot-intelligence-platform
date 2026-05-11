# CortexGrid Sandbox Guide

The sandbox is a pre-loaded demo environment for exploring every CortexGrid feature without connecting real hardware. It ships with sample devices, 24 hours of telemetry data, active alerts, and a Pro-tier organization.

---

## Accessing the Sandbox

### Option A — Docker (recommended)

```bash
docker compose up --build
```

Open http://localhost:3000 and sign in with:

| Field | Value |
|-------|-------|
| **Email** | `demo@cortexgrid.io` |
| **Password** | `Demo@1234` |

First build takes a few minutes. Subsequent starts are instant.

### Option B — Local development

```bash
pnpm install
docker compose up -d postgres redis mosquitto
cp .env.example apps/api/.env
cd apps/api && npx prisma generate && npx prisma migrate dev && npx prisma db seed && cd ../..
pnpm dev
```

Open http://localhost:3000 and sign in with the same credentials above.

---

## What's in the Sandbox

| Resource | Details |
|----------|---------|
| **Organization** | CortexGrid Demo (Pro plan, active) |
| **User** | Demo Admin — `demo@cortexgrid.io` |
| **Devices** | 3 sensors (2 online, 1 offline) |
| **Telemetry** | 24 hours of hourly readings (60 data points) |
| **Alert Rules** | 2 rules (high temp threshold + device offline) |
| **Alerts** | 1 critical, 1 warning (active), 1 info (resolved) |
| **Notifications** | 2 unread |

### Pre-loaded Devices

| Device | Serial | Location | Status |
|--------|--------|----------|--------|
| Temperature Sensor - Lab A | CG-TEMP-001 | Building A - Lab 1 | Online |
| Humidity Sensor - Lab A | CG-HUM-002 | Building A - Lab 1 | Online |
| Pressure Sensor - Boiler Room | CG-PRES-003 | Building B - Boiler Room | Offline |

---

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | demo@cortexgrid.io / Demo@1234 |
| API | http://localhost:3001 | — |
| Swagger Docs | http://localhost:3001/api/v1/docs | — |
| Grafana | http://localhost:3002 | admin / cortexgrid |
| Prometheus | http://localhost:9090 | — |
| Kibana | http://localhost:5601 | — |

---

## Creating Your Own Account

On the **Register** page, fill in all fields to create a new organization:

| Field | Placeholder | What to Enter |
|-------|-------------|---------------|
| First Name | `John` | Your first name (e.g. `Jane`) |
| Last Name | `Doe` | Your last name (e.g. `Smith`) |
| Email Address | `you@company.com` | A valid email (e.g. `jane@startup.io`) |
| Organization Name | `Acme Corp` | Your org name, 2-100 characters (e.g. `Smart Farm Labs`) |
| Password | `Create a strong password` | Min 8 chars with uppercase, lowercase, and a number (e.g. `S3cureP@ss`) |
| Confirm Password | `Confirm your password` | Must match the password above exactly |

---

## Exploring Features

### Dashboard

The main dashboard shows a real-time overview: total devices, active alerts, telemetry volume, and a system health summary. All numbers reflect the sandbox seed data.

### Devices

**Browse and filter devices** at `/devices`:

| Field | Placeholder | What to Enter |
|-------|-------------|---------------|
| Search | `Search devices by name, serial, or location...` | Any keyword (e.g. `temperature`, `CG-TEMP`, `Lab`) |
| Status Filter | *(dropdown)* | `Online`, `Offline`, or `Maintenance` |
| Type Filter | *(dropdown)* | `Sensor`, `Actuator`, or `Gateway` |

**Register a new device** at `/devices/new`:

| Field | Placeholder | What to Enter |
|-------|-------------|---------------|
| Device Name | `e.g. Temperature Sensor A1` | A descriptive name, 2-100 characters (e.g. `CO2 Sensor - Greenhouse`) |
| Device Type | `Select device type` | Choose `SENSOR`, `ACTUATOR`, or `GATEWAY` from the dropdown |
| Description | `Brief description of the device` | Optional free text (e.g. `Monitors CO2 levels in greenhouse zone 2`) |
| Serial Number | `e.g. SN-TMP-001` | Optional hardware serial (e.g. `CG-CO2-010`) |
| Firmware Version | `e.g. 2.1.4` | Optional version string (e.g. `3.0.1`) |
| Location | `e.g. Building A, Floor 2` | Optional physical location (e.g. `Greenhouse - Zone 2`) |
| Tags | `Comma-separated tags (e.g. temperature, lab, precision)` | Optional labels (e.g. `co2, greenhouse, critical`) |
| Custom Metadata | `{"accuracy": "0.1C", "range": "-40 to 125C"}` | Optional JSON object (e.g. `{"range": "0-5000 ppm", "accuracy": "50 ppm"}`) |

**Click a device** to view its telemetry history, status timeline, and metadata.

### Alerts

**View and filter alerts** at `/alerts`:

| Field | Placeholder | What to Enter |
|-------|-------------|---------------|
| Search | `Search alerts...` | Any keyword from the alert title or device name (e.g. `temperature`, `offline`) |
| Severity Filter | *(dropdown)* | `Critical`, `Warning`, or `Info` |
| Status Filter | *(dropdown)* | `Active`, `Acknowledged`, or `Resolved` |

**Manage alert rules** at `/alerts/rules`. The sandbox includes two pre-configured rules:

| Rule | Condition | Severity |
|------|-----------|----------|
| High Temperature Alert | `metrics.value > 25` for 5 min | Warning |
| Device Offline Alert | `status == OFFLINE` for tagged `critical` devices | Critical |

### AI Assistant

Open the **AI** page to analyze your IoT data using natural language:

| Field | Placeholder | What to Enter |
|-------|-------------|---------------|
| Chat Input | `Ask about your IoT data...` | Any question in plain English (e.g. `What is the average temperature in Lab A?` or `Which devices have low battery?`) |

**Anomaly Detection tab** — select a device and metric, then choose a time range to detect outliers.

| Field | Options |
|-------|---------|
| Device | Any device from your organization (e.g. `Temperature Sensor - Lab A`) |
| Metric | `temperature`, `humidity`, `pressure` |
| Time Range | `1h`, `6h`, `24h`, `7d` |

> Requires Ollama running locally. Without it, the AI endpoints return a service-unavailable response.

### Billing

The billing page shows the current plan (Pro in sandbox), usage metrics with progress bars, and a billing history table. Plan upgrade buttons trigger Stripe checkout (sandbox mode uses Stripe test keys — no real charges).

### Settings

**Organization settings** at `/settings`:

| Tab | Field | Placeholder | What to Enter |
|-----|-------|-------------|---------------|
| General | Organization Name | `Enter organization name` | Your org name (e.g. `Smart Farm Labs`) |
| General | Slug | `URL-friendly identifier` | URL-safe string (e.g. `smart-farm-labs`) — used in API endpoints |
| General | Description | `Describe your organization` | Free text about your org |
| Team | Email Address (invite) | `colleague@company.com` | A valid email to send an invitation to (e.g. `bob@startup.io`) |
| Team | Role | *(dropdown)* | `Admin`, `Member`, or `Viewer` |
| Notifications | *(toggles)* | — | Flip switches for alert emails, in-app alerts, billing emails, weekly digest, etc. |

### Global Search

The search bar in the top navigation:

| Field | Placeholder | What to Enter |
|-------|-------------|---------------|
| Search | `Search devices...` | Any keyword — press Enter to jump to the filtered devices list |

---

## Resetting the Sandbox

To wipe everything and start fresh:

```bash
docker compose down -v
docker compose up --build
```

The `-v` flag removes all volumes (database, Redis data, MQTT data). The next `up --build` re-runs migrations and seeds the demo data.

---

## Stopping the Sandbox

```bash
docker compose down
```

This stops containers but preserves data. Run `docker compose up` to resume where you left off.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 or 3001 already in use | `docker compose down` then `docker compose up --build` |
| Database connection failed | `docker compose logs postgres` — ensure Postgres is healthy before the API starts |
| Login returns 401 | Make sure the seed ran: `docker compose logs api \| grep "Seeding complete"` |
| AI queries fail | Ollama must be running at `http://localhost:11434`. Not required for other features |
| Full reset | `docker compose down -v && docker compose up --build` |
| Health check | `curl http://localhost:3001/health` |
