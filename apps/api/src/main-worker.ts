/**
 * main-worker.ts - Entry point for the CortexGrid Render worker.
 *
 * This runs as a persistent process on Render's free tier and handles:
 * - MQTT ingestion from IoT devices (via HiveMQ Cloud)
 * - WebSocket/Socket.io gateway for real-time frontend updates
 * - BullMQ background job processing (alerts, retention, billing, etc.)
 * - Health check endpoint for Render's monitoring and heartbeat pings
 *
 * The REST API runs separately on Vercel serverless (see api/index.ts).
 */
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppWorkerModule } from './app.worker.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditService } from './modules/audit/audit.service';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppWorkerModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  app.use(helmet());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new AuditInterceptor(app.get(Reflector), app.get(AuditService)),
    new TransformInterceptor(),
  );

  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`CortexGrid Worker running on port ${port}`);

  // Graceful shutdown for Render's spin-down behavior
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start CortexGrid Worker:', err);
  throw err;
});
