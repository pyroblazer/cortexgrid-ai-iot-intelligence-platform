import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService } from '../../../modules/ai/ai.service';

@Processor('ai-queries')
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async process(job: Job<{ queryType: string; params: Record<string, any> }>): Promise<void> {
    const { queryType, params } = job.data;
    this.logger.debug(`Processing AI job: ${queryType}`);

    try {
      switch (queryType) {
        case 'batch-anomaly':
          await this.aiService.detectAnomalies(
            params.deviceId,
            params.organizationId,
            params.metric,
            params.timeRange,
            params.sensitivity,
          );
          this.logger.log(`Batch anomaly detection complete for org ${params.organizationId}`);
          break;

        case 'scheduled-summary':
          await this.aiService.summarizeTelemetry(
            params.deviceIds ?? [],
            params.organizationId,
            params.timeRange,
          );
          this.logger.log(`Scheduled summary complete for org ${params.organizationId}`);
          break;

        default:
          this.logger.warn(`Unknown AI query type: ${queryType}`);
      }
    } catch (error) {
      this.logger.error(`AI job failed (${queryType}): ${(error as Error).message}`);
      // Do not rethrow — processor should not crash on failures
    }
  }
}
