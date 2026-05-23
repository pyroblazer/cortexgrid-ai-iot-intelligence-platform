import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [PrismaModule, RedisModule, TelemetryModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
