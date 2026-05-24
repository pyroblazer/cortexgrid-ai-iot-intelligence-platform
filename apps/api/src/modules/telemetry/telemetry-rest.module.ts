/**
 * TelemetryRestModule - REST-only version of TelemetryModule for Vercel serverless.
 *
 * Includes TelemetryController and TelemetryService for HTTP endpoints
 * (POST /telemetry, GET /telemetry, GET /telemetry/latest/:deviceId).
 * Excludes MqttService and TelemetryGateway which run on the Render worker.
 */
import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { UsageModule } from '../../common/usage/usage.module';

@Module({
  imports: [PrismaModule, RedisModule, UsageModule],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryRestModule {}
