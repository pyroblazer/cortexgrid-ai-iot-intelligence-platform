/**
 * AppWorkerModule - Full NestJS module for the Render persistent worker.
 *
 * Includes everything from AppModule plus registers all BullMQ processors.
 * This module runs on Render as a persistent process to handle:
 * - MQTT ingestion from IoT devices (via HiveMQ Cloud)
 * - WebSocket/Socket.io gateway for real-time frontend updates
 * - BullMQ background job processing (alerts, retention, billing, etc.)
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueWorkerModule } from './common/queue/queue-worker.module';
import { UsageModule } from './common/usage/usage.module';
import { PdfModule } from './common/pdf/pdf.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { DeviceModule } from './modules/device/device.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
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
    QueueWorkerModule,
    UsageModule,
    PdfModule,
    // Feature modules (full, with MQTT + WebSocket + BullMQ)
    AuthModule,
    OrganizationModule,
    DeviceModule,
    TelemetryModule,
    AiModule,
    BillingModule,
    AlertModule,
    NotificationModule,
    AuditModule,
    HealthModule,
  ],
})
export class AppWorkerModule {}
