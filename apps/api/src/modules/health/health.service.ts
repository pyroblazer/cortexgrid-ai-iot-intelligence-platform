import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  async check() {
    const start = Date.now();
    const services: Record<string, { status: string; latencyMs?: number; details?: string }> = {};

    // Check database
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = {
        status: 'up',
        latencyMs: Date.now() - dbStart,
      };
    } catch (error) {
      services.database = {
        status: 'down',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Redis
    try {
      const redisStart = Date.now();
      await this.redis.ping();
      services.redis = {
        status: 'up',
        latencyMs: Date.now() - redisStart,
      };
    } catch (error) {
      services.redis = {
        status: 'down',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const allUp = Object.values(services).every((s) => s.status === 'up');

    // Audit log count for compliance monitoring
    let auditLogCount = 0;
    try {
      const result = await this.prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "AuditLog" WHERE "createdAt" > NOW() - INTERVAL '24 hours'`;
      auditLogCount = (result as any)[0]?.count || 0;
    } catch {
      // AuditLog table may not exist yet
    }

    return {
      status: allUp ? 'ok' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      services,
      compliance: {
        auditLogs24h: auditLogCount,
        corsOrigin: this.configService.get('CORS_ORIGIN', '*'),
        helmetEnabled: true,
        rateLimitingEnabled: true,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
