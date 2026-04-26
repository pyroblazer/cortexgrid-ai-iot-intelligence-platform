import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'telemetry-processing' },
      { name: 'alert-evaluation' },
      { name: 'ai-queries' },
      { name: 'notification-delivery' },
      { name: 'billing-webhooks' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
