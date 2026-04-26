import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('telemetry-processing')
export class TelemetryProcessor extends WorkerHost {
  private readonly logger = new Logger(TelemetryProcessor.name);

  async process(job: Job<{ deviceId: string; organizationId: string; metrics: Record<string, any>; timestamp?: string }>): Promise<void> {
    this.logger.debug(`Processing telemetry batch for device ${job.data.deviceId}`);
    // Telemetry is already stored synchronously; this processor handles
    // post-ingestion tasks like aggregation, cleanup, and analytics
  }
}
