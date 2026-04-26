import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('ai-queries')
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  async process(job: Job<{ queryType: string; params: Record<string, any> }>): Promise<void> {
    this.logger.debug(`Processing AI job: ${job.data.queryType}`);
    // Heavy AI operations (batch anomaly detection, scheduled summaries) run here
  }
}
