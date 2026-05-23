import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '../email/email.module';
import { AlertModule } from '../../modules/alert/alert.module';
import { AiModule } from '../../modules/ai/ai.module';
import { TelemetryProcessor } from './processors/telemetry.processor';
import { AlertProcessor } from './processors/alert.processor';
import { AiProcessor } from './processors/ai.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { BillingProcessor } from './processors/billing.processor';
import { RetentionProcessor } from './processors/retention.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: config.get<number>('REDIS_DB', 0),
          tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'telemetry-processing' },
      { name: 'alert-evaluation' },
      { name: 'ai-queries' },
      { name: 'notification-delivery' },
      { name: 'billing-webhooks' },
      { name: 'data-retention' },
    ),
    PrismaModule,
    RedisModule,
    EmailModule,
    AlertModule,
    AiModule,
  ],
  providers: [
    TelemetryProcessor,
    AlertProcessor,
    AiProcessor,
    NotificationProcessor,
    BillingProcessor,
    RetentionProcessor,
  ],
  exports: [BullModule],
})
export class QueueWorkerModule {}
