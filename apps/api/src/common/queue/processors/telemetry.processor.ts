import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RedisService } from '../../redis/redis.service';

@Processor('telemetry-processing')
export class TelemetryProcessor extends WorkerHost {
  private readonly logger = new Logger(TelemetryProcessor.name);

  constructor(private readonly redis: RedisService) {
    super();
  }

  async process(job: Job<{ deviceId: string; organizationId: string; metrics: Record<string, any>; timestamp?: string }>): Promise<void> {
    const { deviceId, organizationId, metrics, timestamp } = job.data;
    this.logger.debug(`Processing telemetry batch for device ${deviceId}`);

    try {
      // Update Redis latest telemetry cache with 5min TTL
      const cacheKey = `cortexgrid:telemetry:latest:${organizationId}:${deviceId}`;
      const payload = JSON.stringify({ metrics, timestamp: timestamp ?? new Date().toISOString() });
      await this.redis.set(cacheKey, payload, 300); // 5 minutes = 300 seconds

      // Publish to Redis channel for WebSocket broadcast
      const channel = `telemetry:${organizationId}`;
      await this.redis.publish(channel, JSON.stringify({ deviceId, metrics, timestamp: timestamp ?? new Date().toISOString() }));

      // Increment org usage counter keyed by hour bucket, 24h TTL
      const now = new Date();
      const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}`;
      const usageKey = `cortexgrid:usage:${organizationId}:${hourBucket}`;
      const client = this.redis.getClient();
      await client.incr(usageKey);
      await this.redis.expire(usageKey, 86400); // 24 hours

      this.logger.debug(`Telemetry post-ingestion complete for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to process telemetry for device ${deviceId}: ${(error as Error).message}`);
    }
  }
}
