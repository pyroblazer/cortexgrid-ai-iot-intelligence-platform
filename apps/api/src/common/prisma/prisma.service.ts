import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    // In serverless (Vercel), limit connections to avoid exhausting Supabase pgbouncer pool
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const datasourceUrl = isServerless && url && !url.includes('connection_limit')
      ? `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`
      : undefined;

    super({
      ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma client connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Prisma client disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }
}
