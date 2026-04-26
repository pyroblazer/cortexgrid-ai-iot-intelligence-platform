import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('notification-delivery')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<{ userId: string; organizationId: string; type: string; title: string; message: string; metadata?: Record<string, any> }>): Promise<void> {
    this.logger.debug(`Delivering notification to user ${job.data.userId}: ${job.data.title}`);
    // In production this would dispatch to email, push, webhook channels
  }
}
