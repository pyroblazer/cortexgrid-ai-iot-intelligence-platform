/**
 * @file main.ts
 * @description Bootstrap entry point for the CortexGrid API server.
 *
 * ELI5: Think of this file as the "ignition key" for the entire API.
 * When you start the server, this is the very first file that runs.
 * It sets up all the foundational pieces:
 *   - Creates the NestJS app from AppModule (the "engine")
 *   - Adds security headers (like a security guard at the door)
 *   - Configures CORS (tells the API which websites are allowed to talk to it)
 *   - Sets up global validation (automatically checks incoming data is valid)
 *   - Adds global error handling and response formatting
 *   - Generates interactive Swagger API documentation
 *   - Starts listening for HTTP requests on a port
 *
 * Without this file, none of the routes, services, or modules would work.
 */
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditService } from './modules/audit/audit.service';
import { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Bootstrap function - starts the entire API server.
 *
 * ELI5: This is like turning the key in a car ignition. It wakes up
 * the framework, wires up all the plugins (security, validation, docs),
 * and starts listening for incoming requests.
 */
async function bootstrap() {
  // Create the NestJS application instance.
  // NestExpressApplication gives us Express-specific features like serving static files.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Pull configuration values from environment variables (.env file).
  // PORT defaults to 3001 if not specified.
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // Helmet adds security-related HTTP headers to every response.
  // ELI5: Like putting locks on all the doors - prevents common web attacks
  // like clickjacking, XSS, and MIME-type sniffing.
  app.use(helmet());

  // CORS (Cross-Origin Resource Sharing) controls which frontend websites
  // can make requests to this API.
  // ELI5: Imagine a bouncer at a club who checks if visitors are on the guest list.
  // In development we allow everyone ('*'), but in production we'd restrict this
  // to our actual frontend domain.
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true, // Allow sending cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Set a global prefix for all routes. Every URL will start with /api/v1/
  // Example: /auth/login becomes /api/v1/auth/login
  // The 'health' endpoint is excluded so it stays at the root for load balancers.
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // Global validation pipe - automatically validates ALL incoming request bodies
  // against their DTO (Data Transfer Object) classes.
  // ELI5: Like a quality inspector on an assembly line who checks every package
  // before it enters the factory.
  //   - whitelist: strips away any extra fields the DTO doesn't expect
  //   - forbidNonWhitelisted: throws an error if extra fields are sent (strict mode)
  //   - transform: automatically converts plain strings to their expected types
  //     (e.g., "5" becomes the number 5 if the DTO expects a number)
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

  // Register global filters and interceptors that apply to EVERY request/response:
  //   - AllExceptionsFilter: catches any unhandled errors and returns a clean JSON response
  //   - LoggingInterceptor: logs request details and response times
  //   - TransformInterceptor: wraps all successful responses in a standard { success, data, timestamp } format
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new AuditInterceptor(app.get(Reflector), app.get(AuditService)),
    new TransformInterceptor(),
  );

  // ── Swagger API Documentation Setup ──
  // Swagger generates an interactive web page where developers can see and test
  // every API endpoint without writing code. Think of it as an auto-generated
  // instruction manual for the API.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CortexGrid API')
    .setDescription(
      'CortexGrid IoT Intelligence Platform API - Multi-tenant IoT SaaS backend',
    )
    .setVersion('1.0')
    // Configure JWT Bearer authentication so developers can test protected endpoints
    // directly in the Swagger UI by pasting their token.
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
    // Organize the documentation into sections by feature area.
    .addTag('Auth', 'Authentication & authorization')
    .addTag('Organizations', 'Organization management')
    .addTag('Devices', 'IoT device management')
    .addTag('Telemetry', 'Device telemetry data')
    .addTag('AI', 'AI-powered analytics')
    .addTag('Billing', 'Subscription & billing')
    .addTag('Alerts', 'Alert rules & management')
    .addTag('Notifications', 'User notifications')
    .addTag('Health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Serve the interactive Swagger UI at /api/v1/docs
  SwaggerModule.setup('api/v1/docs', app, document);

  // Start listening for incoming HTTP requests on the configured port.
  // The app is now "live" and ready to accept connections.
  await app.listen(port);
  console.log(`CortexGrid API running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/v1/docs`);
}

// Kick off the server - this is the first thing that runs when the file is loaded.
bootstrap();
