import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Health (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      try {
        const prisma = app.get(PrismaService);
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
      } catch {
        // Ignore cleanup errors during teardown
      }
      await app.close();
    }
  });

  it('GET /health should return status with service checks', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res: any) => {
        // TransformInterceptor wraps in { success, data, timestamp }
        const body = res.body;
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('services');
        expect(body.data.services).toHaveProperty('database');
        expect(body.data.services).toHaveProperty('redis');
        expect(body.data.services.database.status).toBe('up');
        expect(body.data.services.redis.status).toBe('up');
      });
  });

  it('GET /health should include uptime and version', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.data).toHaveProperty('uptime');
        expect(res.body.data).toHaveProperty('version');
        expect(typeof res.body.data.uptime).toBe('number');
      });
  });
});
