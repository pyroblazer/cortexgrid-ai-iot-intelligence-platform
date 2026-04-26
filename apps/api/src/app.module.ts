/**
 * @file app.module.ts
 * @description Root module (composition root) for the CortexGrid API.
 *
 * ELI5: Think of this file as the "master control panel" that connects
 * all the different parts of the API together. In NestJS, a Module is
 * like a container that groups related features. This root module imports
 * all the other modules so they can work together as one application.
 *
 * What each imported module does:
 *   - ConfigModule: Reads .env files so we can use secrets and settings
 *   - ThrottlerModule: Prevents abuse by limiting how many requests a user can make
 *   - PrismaModule: Talks to the PostgreSQL database
 *   - RedisModule: Talks to Redis (fast temporary storage / cache)
 *   - QueueModule: Background job processing (tasks that take time)
 *   - AuthModule: User login, registration, JWT tokens
 *   - OrganizationModule: Multi-tenant organization management
 *   - DeviceModule: IoT device registration and management
 *   - TelemetryModule: Sensor data ingestion and querying
 *   - AiModule: AI-powered analytics and anomaly detection
 *   - BillingModule: Stripe subscriptions and payment handling
 *   - AlertModule: Alert rules and real-time alerting
 *   - NotificationModule: User notification delivery
 *   - HealthModule: Health check endpoints for monitoring
 *
 * WHY a single root module? It lets NestJS understand the dependency graph
 * and wire up dependency injection across the entire application.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './common/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { DeviceModule } from './modules/device/device.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { AiModule } from './modules/ai/ai.module';
import { BillingModule } from './modules/billing/billing.module';
import { AlertModule } from './modules/alert/alert.module';
import { NotificationModule } from './modules/notification/notification.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // ConfigModule reads environment variables from .env files.
    // isGlobal: true means every module can use ConfigService without importing ConfigModule again.
    // envFilePath checks both the local .env and the monorepo root .env.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // ThrottlerModule protects the API from being overwhelmed by too many requests.
    // Here we allow a maximum of 100 requests per 60 seconds (1 minute) per client.
    // ELI5: Like a rate limiter at a water fountain - you can only drink so fast.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // Time window in milliseconds (60 seconds)
        limit: 100,   // Max number of requests allowed in that window
      },
    ]),

    // ── Infrastructure Modules ──
    // These provide the foundational services (database, cache, job queue)
    // that the feature modules depend on.
    PrismaModule,    // PostgreSQL database access via Prisma ORM
    RedisModule,     // In-memory cache and pub/sub via Redis
    QueueModule,     // Background job processing (BullMQ)

    // ── Feature Modules ──
    // Each module encapsulates a specific business domain.
    AuthModule,           // Authentication (login, register, JWT)
    OrganizationModule,   // Multi-tenant organization management
    DeviceModule,         // IoT device CRUD and status tracking
    TelemetryModule,      // Sensor data ingestion, querying, aggregation
    AiModule,             // AI-powered analytics (Ollama + statistical)
    BillingModule,        // Stripe payment integration
    AlertModule,          // Alert rules engine and alert management
    NotificationModule,   // User notification delivery
    HealthModule,         // Health check endpoints for infrastructure monitoring
  ],
  providers: [
    // Register ThrottlerGuard as a global guard.
    // This means EVERY endpoint in the app is rate-limited automatically
    // unless explicitly opted out with @SkipThrottle() decorator.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
