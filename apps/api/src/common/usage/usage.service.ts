import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async increment(orgId: string, field: string, amount = 1): Promise<void> {
    const key = `usage:${orgId}:${field}`;
    try {
      await this.redis.incrby(key, amount);
    } catch {
      this.logger.warn(`Failed to increment usage ${key}`);
    }
  }

  async get(orgId: string, field: string): Promise<number> {
    const key = `usage:${orgId}:${field}`;
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  async flushToDb(orgId: string): Promise<void> {
    const fields = ['telemetryCount', 'aiQueries', 'apiCalls'];
    const now = new Date();
    const period = new Date(now.getFullYear(), now.getMonth(), 1);

    const values: Record<string, number> = {};
    for (const field of fields) {
      values[field] = await this.get(orgId, field);
    }

    if (Object.values(values).every((v) => v === 0)) return;

    await this.prisma.usageRecord.upsert({
      where: { organizationId_period: { organizationId: orgId, period } },
      create: {
        organizationId: orgId,
        period,
        telemetryCount: values.telemetryCount,
        aiQueries: values.aiQueries,
        apiCalls: values.apiCalls,
        deviceCount: 0,
        storageUsedMb: 0,
      },
      update: {
        telemetryCount: values.telemetryCount,
        aiQueries: values.aiQueries,
        apiCalls: values.apiCalls,
      },
    });
  }
}
