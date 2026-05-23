import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RetentionProcessor } from './processors/retention.processor';
import { PrismaModule } from '../prisma/prisma.module';
import type { QueueOptions } from 'bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): QueueOptions => {
        const url = config.get<string>('REDIS_URL');
        if (url) {
          return { connection: url as QueueOptions['connection'] };
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD') || undefined,
            db: config.get<number>('REDIS_DB', 0),
            tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
          },
        };
      },
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
  ],
  providers: [RetentionProcessor],
  exports: [BullModule],
})
export class QueueModule {}
