import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryGateway } from './telemetry.gateway';
import { MqttService } from './mqtt/mqtt.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryGateway, MqttService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
