import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RetentionProcessor } from './processors/retention.processor';
import { PrismaModule } from '../prisma/prisma.module';
import Redis from 'ioredis';
import type { QueueOptions } from 'bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): QueueOptions => {
        const url = config.get<string>('REDIS_URL');
        if (url) {
          // Log when using REDIS_URL (Upstash)
          console.log('[QueueModule] Using REDIS_URL for BullMQ connection');
          // Create Redis instance from URL for BullMQ
          // ioredis auto-detects TLS from rediss:// scheme
          const redis = new Redis(url, {
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
            maxRetriesPerRequest: null,
          });
          return { connection: redis };
        }
        // Log when falling back to host/port (localhost)
        console.log('[QueueModule] Using REDIS_HOST/PORT for BullMQ connection');
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
