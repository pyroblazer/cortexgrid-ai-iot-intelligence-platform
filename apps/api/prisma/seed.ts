import { PrismaClient, DeviceType, AlertSeverity, NotificationType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Create demo organization ────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Demo@1234", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "demo@cortexgrid.io" },
    update: {},
    create: {
      email: "demo@cortexgrid.io",
      passwordHash,
      firstName: "Demo",
      lastName: "Admin",
      emailVerified: true,
      isActive: true,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "cortexgrid-demo" },
    update: {},
    create: {
      name: "CortexGrid Demo",
      slug: "cortexgrid-demo",
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      deviceLimit: 50,
      isActive: true,
      settings: {
        timezone: "UTC",
        telemetryRetentionDays: 90,
        alertNotificationsEnabled: true,
      },
      ownerId: adminUser.id,
    },
  });

  // ── Create membership ───────────────────────────────────────────────────
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: adminUser.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: organization.id,
      role: "OWNER",
      isActive: true,
    },
  });

  // ── Create sample devices ───────────────────────────────────────────────
  const temperatureSensor = await prisma.device.upsert({
    where: { serialNumber: "CG-TEMP-001" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Temperature Sensor - Lab A",
      serialNumber: "CG-TEMP-001",
      type: DeviceType.SENSOR,
      status: "ONLINE",
      profile: {
        manufacturer: "CortexGrid",
        model: "CG-T100",
        protocol: "MQTT",
        samplingRateSeconds: 30,
      },
      metadata: {
        unit: "celsius",
        range: { min: -40, max: 125 },
        accuracy: 0.1,
      },
      firmwareVersion: "2.1.3",
      location: "Building A - Lab 1",
      tags: ["temperature", "lab-a", "critical"],
      lastSeenAt: new Date(),
      isActive: true,
    },
  });

  const humiditySensor = await prisma.device.upsert({
    where: { serialNumber: "CG-HUM-002" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Humidity Sensor - Lab A",
      serialNumber: "CG-HUM-002",
      type: DeviceType.SENSOR,
      status: "ONLINE",
      profile: {
        manufacturer: "CortexGrid",
        model: "CG-H200",
        protocol: "MQTT",
        samplingRateSeconds: 60,
      },
      metadata: {
        unit: "percent",
        range: { min: 0, max: 100 },
        accuracy: 2.0,
      },
      firmwareVersion: "2.1.3",
      location: "Building A - Lab 1",
      tags: ["humidity", "lab-a"],
      lastSeenAt: new Date(),
      isActive: true,
    },
  });

  const pressureSensor = await prisma.device.upsert({
    where: { serialNumber: "CG-PRES-003" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Pressure Sensor - Boiler Room",
      serialNumber: "CG-PRES-003",
      type: DeviceType.SENSOR,
      status: "OFFLINE",
      profile: {
        manufacturer: "CortexGrid",
        model: "CG-P300",
        protocol: "MQTT",
        samplingRateSeconds: 15,
      },
      metadata: {
        unit: "kPa",
        range: { min: 0, max: 1000 },
        accuracy: 0.5,
      },
      firmwareVersion: "1.8.7",
      location: "Building B - Boiler Room",
      tags: ["pressure", "boiler", "critical"],
      lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      isActive: true,
    },
  });

  // ── Create sample telemetry data ────────────────────────────────────────
  const telemetryData = [];
  const now = Date.now();

  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now - i * 60 * 60 * 1000); // hourly data points

    // Temperature readings
    telemetryData.push({
      deviceId: temperatureSensor.id,
      organizationId: organization.id,
      timestamp,
      metrics: {
        value: +(20 + Math.sin(i / 4) * 3 + Math.random() * 0.5).toFixed(2),
        unit: "celsius",
        batteryLevel: Math.max(0, 100 - i * 0.3),
      },
    });

    // Humidity readings
    telemetryData.push({
      deviceId: humiditySensor.id,
      organizationId: organization.id,
      timestamp,
      metrics: {
        value: +(55 + Math.cos(i / 3) * 10 + Math.random() * 2).toFixed(2),
        unit: "percent",
        batteryLevel: Math.max(0, 100 - i * 0.2),
      },
    });

    // Pressure readings (only for the last 12 hours since it went offline)
    if (i >= 12) {
      telemetryData.push({
        deviceId: pressureSensor.id,
        organizationId: organization.id,
        timestamp,
        metrics: {
          value: +(101.3 + Math.sin(i / 6) * 2 + Math.random() * 0.3).toFixed(2),
          unit: "kPa",
          batteryLevel: Math.max(0, 85 - (i - 12) * 0.5),
        },
      });
    }
  }

  await prisma.telemetry.createMany({ data: telemetryData });

  // ── Create sample alert rules ───────────────────────────────────────────
  const tempRule = await prisma.alertRule.create({
    data: {
      organizationId: organization.id,
      name: "High Temperature Alert",
      description: "Triggers when temperature exceeds 25 celsius",
      condition: {
        field: "metrics.value",
        operator: "greaterThan",
        threshold: 25,
        durationSeconds: 300,
      },
      severity: AlertSeverity.WARNING,
      isActive: true,
    },
  });

  const pressureRule = await prisma.alertRule.create({
    data: {
      organizationId: organization.id,
      name: "Device Offline Alert",
      description: "Triggers when a critical device goes offline",
      condition: {
        field: "status",
        operator: "equals",
        threshold: "OFFLINE",
        deviceTags: ["critical"],
      },
      severity: AlertSeverity.CRITICAL,
      isActive: true,
    },
  });

  // ── Create sample alerts ────────────────────────────────────────────────
  await prisma.alert.createMany({
    data: [
      {
        organizationId: organization.id,
        deviceId: temperatureSensor.id,
        ruleId: tempRule.id,
        severity: AlertSeverity.WARNING,
        status: "ACTIVE",
        title: "High Temperature Detected",
        message: `Temperature in Lab A has exceeded 25C threshold. Current reading: 26.4C`,
        metadata: { currentValue: 26.4, threshold: 25 },
      },
      {
        organizationId: organization.id,
        deviceId: pressureSensor.id,
        ruleId: pressureRule.id,
        severity: AlertSeverity.CRITICAL,
        status: "ACTIVE",
        title: "Critical Device Offline",
        message: `Pressure sensor in Boiler Room has been offline for over 2 hours. Last reading: 101.3 kPa`,
        metadata: { offlineDurationMinutes: 120, lastValue: 101.3 },
      },
      {
        organizationId: organization.id,
        deviceId: humiditySensor.id,
        severity: AlertSeverity.INFO,
        status: "RESOLVED",
        title: "Humidity Spike",
        message: `Humidity in Lab A briefly spiked to 68%. The reading has returned to normal levels.`,
        metadata: { peakValue: 68, normalValue: 55 },
        resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    ],
  });

  // ── Create sample notifications ─────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        organizationId: organization.id,
        type: NotificationType.ALERT,
        title: "Critical Device Offline",
        message: "Pressure sensor CG-PRES-003 in Boiler Room is offline.",
        isRead: false,
      },
      {
        userId: adminUser.id,
        organizationId: organization.id,
        type: NotificationType.SYSTEM,
        title: "Welcome to CortexGrid",
        message: "Your demo environment is ready. Explore the dashboard and connect your first IoT devices.",
        isRead: false,
      },
    ],
  });

  // ── Create usage record ─────────────────────────────────────────────────
  await prisma.usageRecord.create({
    data: {
      organizationId: organization.id,
      period: new Date(now),
      deviceCount: 3,
      telemetryCount: telemetryData.length,
      apiCalls: 0,
      aiQueries: 0,
      storageUsedMb: 2.4,
    },
  });

  console.log("Seeding complete.");
  console.log(`  Organization: ${organization.name} (${organization.slug})`);
  console.log(`  Admin user:   demo@cortexgrid.io`);
  console.log(`  Devices:      ${[temperatureSensor, humiditySensor, pressureSensor].map((d) => d.name).join(", ")}`);
  console.log(`  Telemetry:    ${telemetryData.length} data points`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
