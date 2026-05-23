/**
 * AppRestModule - Lightweight NestJS module for Vercel serverless.
 *
 * Excludes MQTT subscriber, WebSocket gateway, and BullMQ processors
 * since those require a persistent process (handled by the Render worker).
 *
 * Includes all REST API controllers and services needed for:
 * - Auth (login, register, refresh)
 * - Organizations (CRUD)
 * - Devices (CRUD)
 * - Telemetry (HTTP ingestion + querying)
 * - AI (natural language queries, anomaly detection)
 * - Billing (Stripe)
 * - Alerts (CRUD)
 * - Notifications (CRUD)
 * - Audit (logging)
 * - Health checks
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { DeviceModule } from './modules/device/device.module';
import { TelemetryRestModule } from './modules/telemetry/telemetry-rest.module';
import { AiModule } from './modules/ai/ai.module';
import { BillingModule } from './modules/billing/billing.module';
import { AlertModule } from './modules/alert/alert.module';
import { NotificationModule } from './modules/notification/notification.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    // Infrastructure
    PrismaModule,
    RedisModule,
    // Feature modules (REST-only, no MQTT/WebSocket/BullMQ)
    AuthModule,
    OrganizationModule,
    DeviceModule,
    TelemetryRestModule,
    AiModule,
    BillingModule,
    AlertModule,
    NotificationModule,
    AuditModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppRestModule {}
