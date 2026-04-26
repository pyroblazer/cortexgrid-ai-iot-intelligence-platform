import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('billing-webhooks')
export class BillingProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingProcessor.name);

  async process(job: Job<{ eventType: string; payload: Record<string, any> }>): Promise<void> {
    this.logger.debug(`Processing billing webhook: ${job.data.eventType}`);
    // Async post-processing of Stripe events: usage tracking, email notifications, audit logging
  }
}
