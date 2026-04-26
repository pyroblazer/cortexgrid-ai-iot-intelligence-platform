import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AlertService } from '../../../modules/alert/alert.service';

@Processor('alert-evaluation')
export class AlertProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertProcessor.name);

  constructor(private readonly alertService: AlertService) {
    super();
  }

  async process(job: Job<{ deviceId: string; organizationId: string; metrics: Record<string, any> }>): Promise<void> {
    this.logger.debug(`Evaluating alert rules for device ${job.data.deviceId}`);
    await this.alertService.evaluateAlertRules(job.data.deviceId, job.data.organizationId, job.data.metrics);
  }
}
