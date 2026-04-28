import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('data-retention')
export class RetentionProcessor extends WorkerHost {
  private readonly logger = new Logger(RetentionProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log('Starting data retention enforcement job');

    const organizations = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    let totalDeleted = 0;

    for (const org of organizations) {
      const settings = org.settings as Record<string, any> || {};
      const retentionDays = settings.telemetryRetentionDays || 30;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const result = await this.prisma.telemetry.deleteMany({
        where: {
          organizationId: org.id,
          timestamp: { lt: cutoff },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Org ${org.name} (${org.id}): Deleted ${result.count} telemetry records older than ${retentionDays} days`,
        );
        totalDeleted += result.count;
      }
    }

    this.logger.log(`Retention job complete: ${totalDeleted} records deleted across ${organizations.length} organizations`);
  }
}
