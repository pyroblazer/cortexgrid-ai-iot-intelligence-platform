# CortexGrid Sandbox Guide

A hands-on walkthrough of every CortexGrid feature using the pre-loaded demo environment. Every input field shows its placeholder text so you know exactly what to type.

---

## Starting the Sandbox

### With Docker

```bash
docker compose up --build
```

Open http://localhost:3000 when the build finishes.

> First build takes a few minutes. Subsequent starts are instant.

### Without Docker

```bash
pnpm install
docker compose up -d postgres redis mosquitto
cp .env.example apps/api/.env
cd apps/api && npx prisma generate && npx prisma migrate dev && npx prisma db seed && cd ../..
pnpm dev
```

Open http://localhost:3000.

### Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | demo@cortexgrid.io / Demo@1234 |
| API | http://localhost:3001 | — |
| Swagger Docs | http://localhost:3001/api/v1/docs | — |
| Grafana | http://localhost:3002 | admin / cortexgrid |
| Prometheus | http://localhost:9090 | — |
| Kibana | http://localhost:5601 | — |

### Resetting the Sandbox

```bash
# Wipe all data and start fresh
docker compose down -v
docker compose up --build
```

---

## What's Pre-Loaded

The seed creates a complete demo environment you can explore immediately:

| Resource | Details |
|----------|---------|
| Organization | CortexGrid Demo — Pro plan, active subscription |
| User | Demo Admin (`demo@cortexgrid.io`) |
| Devices | 3 sensors across 2 locations (2 online, 1 offline) |
| Telemetry | 60 hourly data points spanning the last 24 hours |
| Alert Rules | 2 active rules (high temperature + device offline) |
| Alerts | 3 alerts: 1 critical, 1 warning, 1 resolved |
| Notifications | 2 unread |

### Sample Devices

| Device | Serial | Location | Status | Metrics |
|--------|--------|----------|--------|---------|
| Temperature Sensor - Lab A | CG-TEMP-001 | Building A - Lab 1 | Online | Celsius, battery % |
| Humidity Sensor - Lab A | CG-HUM-002 | Building A - Lab 1 | Online | Percent, battery % |
| Pressure Sensor - Boiler Room | CG-PRES-003 | Building B - Boiler Room | Offline | kPa, battery % |

---

## Feature Walkthrough

### 1. Logging In

Go to http://localhost:3000. You land on the login page.

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| Email | `you@company.com` | `demo@cortexgrid.io` |
| Password | `Enter your password` | `Demo@1234` |

Click **Sign In**. You arrive at the dashboard.

---

### 2. Dashboard

The dashboard gives you an at-a-glance view of your IoT fleet:

- **Total Devices** — count of all registered devices (3 in sandbox)
- **Active Alerts** — number of unresolved alerts (2 in sandbox)
- **Telemetry Data Points** — total readings ingested (60 in sandbox)
- **System Health** — status of database, Redis, MQTT broker
- **Recent Activity** — latest alerts and device status changes

No inputs here — just explore the cards and charts.

---

### 3. Registering a New Account

Click **Sign Up** on the login page, or navigate to `/register`.

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| First Name | `John` | `Jane` |
| Last Name | `Doe` | `Smith` |
| Email | `you@company.com` | `jane@smartfarm.io` |
| Organization | `Acme Corp` | `Smart Farm Labs` |
| Password | `Create a strong password` | `FarmL@bs2026` |
| Confirm Password | `Confirm your password` | `FarmL@bs2026` |

> Passwords must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.

On submit, a new organization is created with you as the owner. You are automatically logged in.

---

### 4. Devices

#### Browsing and Filtering Devices

Navigate to **Devices** in the sidebar.

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| Search | `Search devices by name, serial, or location...` | `temperature` |
| Status Filter | *(dropdown)* | `Online` |
| Type Filter | *(dropdown)* | `Sensor` |

**Example:** Type `Lab` in the search bar to see both Lab A sensors. Change the status filter to `Offline` to see the Pressure Sensor - Boiler Room.

#### Registering a New Device

Click **Add Device** or navigate to `/devices/new`.

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| Device Name | `e.g. Temperature Sensor A1` | `CO2 Sensor - Greenhouse` |
| Device Type | `Select device type` | Choose `SENSOR` from the dropdown |
| Description | `Brief description of the device` | `Monitors CO2 concentration in greenhouse zone 2` |
| Serial Number | `e.g. SN-TMP-001` | `CG-CO2-010` |
| Firmware Version | `e.g. 2.1.4` | `3.0.1` |
| Location | `e.g. Building A, Floor 2` | `Greenhouse - Zone 2` |
| Tags | `Comma-separated tags (e.g. temperature, lab, precision)` | `co2, greenhouse, critical` |
| Custom Metadata | `{"accuracy": "0.1C", "range": "-40 to 125C"}` | `{"range": "0-5000 ppm", "accuracy": "50 ppm", "warmup": "30s"}` |

> Tags and metadata are optional but useful for filtering and AI queries later. Separate tags with commas. Metadata must be valid JSON.

#### Viewing a Device

Click any device row to open its detail page. You will see:

- **Status badge** (Online/Offline/Maintenance)
- **Firmware version** and serial number
- **Location** and tags
- **Telemetry chart** — readings over time for each metric
- **Device profile** — manufacturer, model, protocol, sampling rate
- **Raw metadata** — JSON configuration

**Example:** Click **Temperature Sensor - Lab A** to see a sine-wave chart of temperature readings over the last 24 hours. The battery level declines steadily from 100% to ~93%.

---

### 5. Alerts

#### Browsing and Filtering Alerts

Navigate to **Alerts** in the sidebar.

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| Search | `Search alerts...` | `offline` |
| Severity Filter | *(dropdown)* | `Critical` |
| Status Filter | *(dropdown)* | `Active` |

**Example:** Filter by severity `Critical` to see the "Critical Device Offline" alert for the Pressure Sensor in the Boiler Room. Change status to `Resolved` to see the "Humidity Spike" info alert.

Each alert row shows:
- **Severity badge** (Critical = red, Warning = yellow, Info = blue)
- **Title and message** describing what happened
- **Device name** that triggered it
- **Timestamp**
- **Status** with an acknowledge button for active alerts

#### Managing Alert Rules

Navigate to **Alerts > Rules** in the sidebar.

The sandbox has two pre-configured rules:

| Rule | Condition | Severity | Status |
|------|-----------|----------|--------|
| High Temperature Alert | Temperature > 25 C for 5 minutes | Warning | Active |
| Device Offline Alert | Status = OFFLINE for devices tagged `critical` | Critical | Active |

You can toggle rules on/off, edit them, or delete them.

---

### 6. AI Assistant

Navigate to **AI** in the sidebar. There are two tabs: **Chat** and **Anomaly Detection**.

> The AI features require Ollama running at `http://localhost:11434`. If Ollama is not running, queries return a service-unavailable message. All other features work without it.

#### Chat Tab

Ask questions about your IoT data in plain English.

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| Chat Input | `Ask about your IoT data...` | `What is the average temperature in Lab A over the last 24 hours?` |

**More example prompts:**

```
Which devices have low battery levels?
Show me humidity trends for the past day.
What caused the high temperature alert?
Compare temperature readings across all sensors.
```

Press **Enter** to send. Press **Shift+Enter** to add a new line without sending.

#### Anomaly Detection Tab

Detect statistical outliers in your telemetry data.

| Field | Placeholder Shown | What to Select |
|-------|--------------------|----------------|
| Device | *(dropdown)* | `Temperature Sensor - Lab A` |
| Metric | *(dropdown)* | `temperature` |
| Time Range | *(dropdown)* | `24h` |

**Example:** Select **Temperature Sensor - Lab A**, metric **temperature**, range **24h**. Click **Detect Anomalies**. The system analyzes the sine-wave pattern and flags any readings that deviate significantly from the expected range.

---

### 7. Billing

Navigate to **Billing** in the sidebar.

No inputs here — this is a read-only view showing:

- **Current Plan** card — Pro tier with usage limits (50 devices, 10k telemetry/day, 100 AI queries/day)
- **Usage meters** — progress bars for devices, telemetry, AI queries, and storage against your plan limits
- **Plan cards** — Free, Pro, and Enterprise with feature comparisons and upgrade buttons
- **Billing history** — table of past invoices with download links

> The sandbox uses Stripe test keys. Clicking "Upgrade Plan" opens a Stripe checkout page in test mode — no real charges.

---

### 8. Settings

Navigate to **Settings** in the sidebar. Three tabs: **General**, **Team**, and **Notifications**.

#### General Tab

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| Organization Name | `Enter organization name` | `CortexGrid Demo` |
| Slug | `URL-friendly identifier` | `cortexgrid-demo` |
| Description | `Describe your organization` | `IoT monitoring and analytics for industrial applications` |

> The slug is used in API endpoints and must be URL-safe (lowercase letters, numbers, hyphens). Example: `my-company` instead of `My Company`.

Click **Save Changes** to apply.

#### Team Tab

View current members and invite new ones.

**Invite Member:**

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| Email | `colleague@company.com` | `bob@smartfarm.io` |
| Role | *(dropdown)* | `Admin`, `Member`, or `Viewer` |

**Example:** Type `bob@smartfarm.io`, select role `Member`, click **Send Invitation**. The invitee receives an email with a link to join the organization.

**Roles explained:**

| Role | Can Do |
|------|--------|
| Admin | Manage members, change settings, full access to all features |
| Member | Create/edit devices, view all data, manage their own alerts |
| Viewer | Read-only access to dashboards, devices, and telemetry |

#### Notifications Tab

Toggle notification preferences on or off:

| Toggle | Description |
|--------|-------------|
| Alert Emails | Receive email when an alert triggers |
| Alert In-App | Show in-app notifications for alerts |
| Billing Emails | Receive billing and payment receipts via email |
| System Emails | Receive system maintenance and update emails |
| Weekly Digest | Get a weekly summary email of device activity |
| Device Offline | Get notified when a device goes offline |

---

### 9. Global Search

The search bar in the top navigation lets you quickly find devices.

| Field | Placeholder Shown | What to Type |
|-------|--------------------|--------------|
| Search | `Search devices...` | `boiler` |

**Example:** Type `boiler` and press **Enter**. You are redirected to `/devices?search=boiler` showing the Pressure Sensor - Boiler Room.

---

## API Exploration

### Swagger Docs

Open http://localhost:3001/api/v1/docs to browse all API endpoints with interactive documentation.

### Health Check

```bash
curl http://localhost:3001/health
```

Returns database, Redis, and MQTT status.

### Example API Calls

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@cortexgrid.io","password":"Demo@1234"}'

# List devices (replace TOKEN with accessToken from login response)
curl http://localhost:3001/api/v1/devices \
  -H "Authorization: Bearer TOKEN"

# Get telemetry for a device
curl "http://localhost:3001/api/v1/telemetry/device/DEVICE_ID?range=24h" \
  -H "Authorization: Bearer TOKEN"
```

---

## Quick Reference

### Docker Commands

```bash
docker compose up --build          # Start fresh
docker compose up --build -d       # Start in background
docker compose down                # Stop (keeps data)
docker compose down -v             # Stop and wipe all data
docker compose logs -f api         # Follow API logs
docker compose logs -f web         # Follow web logs
docker compose up --build -d api   # Rebuild just the API
```

### Test Commands

```bash
pnpm test:unit                     # Unit tests
pnpm test:integration              # Integration tests (needs postgres + redis)
pnpm --filter @cortexgrid/web test:e2e   # E2E tests
```

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 3000 or 3001 in use | `docker compose down && docker compose up --build` |
| Database connection failed | `docker compose logs postgres` then `docker compose restart postgres` |
| Login returns 401 | Check seed ran: `docker compose logs api \| grep "Seeding complete"` |
| AI queries fail | Start Ollama at `localhost:11434` — not required for other features |
| Blank page after login | Clear browser cache, hard refresh with Ctrl+Shift+R |
| Full reset | `docker compose down -v && docker compose up --build` |

---

## Further Reading

- [README.md](README.md) — full project documentation
- [docs/setup-guide.md](docs/setup-guide.md) — detailed local development setup
- [docs/design-decisions.md](docs/design-decisions.md) — architecture decisions and tradeoffs
