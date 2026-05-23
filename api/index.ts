/**
 * Vercel Serverless Adapter for CortexGrid REST API.
 *
 * Follows the same pattern as Quorvexa's gateway/api/index.ts:
 * - Bootstraps NestJS with ExpressAdapter
 * - Caches the app instance across serverless invocations
 * - Exports a handler function for Vercel's serverless runtime
 *
 * This loads AppRestModule which excludes MQTT subscriber,
 * WebSocket gateway, and BullMQ processors (those run on Render).
 */
import type { Request, Response } from 'express';
import express from 'express';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppRestModule } from '../apps/api/src/app.rest.module';
import { AllExceptionsFilter } from '../apps/api/src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../apps/api/src/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '../apps/api/src/common/interceptors/logging.interceptor';
import { AuditInterceptor } from '../apps/api/src/common/interceptors/audit.interceptor';
import { AuditService } from '../apps/api/src/modules/audit/audit.service';
import { Reflector } from '@nestjs/core';

const server = express();
const adapter = new ExpressAdapter(server);
let cachedApp: Awaited<ReturnType<typeof NestFactory.create>> | null = null;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppRestModule, adapter, {
      logger: ['error', 'warn', 'log'],
      rawBody: true,
    });

    app.use(helmet());

    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
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

    const swaggerConfig = new DocumentBuilder()
      .setTitle('CortexGrid API')
      .setDescription('CortexGrid IoT Intelligence Platform API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document);

    await app.init();
    cachedApp = app;
  }
  return server;
}

export default async (req: Request, res: Response) => {
  const app = await bootstrap();
  app(req, res);
};
