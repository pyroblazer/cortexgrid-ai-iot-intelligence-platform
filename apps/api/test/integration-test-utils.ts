import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { PrismaService } from '../src/common/prisma/prisma.service';

export const TEST_USER = {
  email: `int-test-${Date.now()}@cortexgrid.io`,
  password: 'TestP@ss1234',
  firstName: 'Integration',
  lastName: 'Tester',
  organizationName: 'Integration Test Org',
};

export const TEST_DEVICE = {
  name: 'Integration Test Sensor',
  type: 'SENSOR',
  serialNumber: `INT-SN-${Date.now()}`,
  firmwareVersion: '1.0.0',
  location: 'Test Lab',
  tags: ['integration', 'test'],
  profile: {
    manufacturer: 'TestCorp',
    model: 'TS-100',
    metrics: [
      { key: 'temperature', unit: 'celsius', type: 'number', min: -40, max: 85 },
    ],
  },
};

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

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
  return app;
}

export async function cleanupDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const tableNames = [
    'Notification',
    'Alert',
    'AlertRule',
    'Telemetry',
    'UsageRecord',
    'Invitation',
    'Membership',
    'Device',
    'Organization',
    'User',
  ];
  for (const table of tableNames) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

export async function registerTestUser(
  app: INestApplication,
  userOverrides?: Partial<typeof TEST_USER>,
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  organizationId: string;
}> {
  const userData = { ...TEST_USER, ...userOverrides };
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(userData);

  if (res.status !== 201) {
    throw new Error(`Failed to register test user: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
    userId: res.body.data.user.id,
    email: res.body.data.user.email,
    organizationId: res.body.data.organization.id,
  };
}

export async function createTestDevice(
  app: INestApplication,
  accessToken: string,
  deviceOverrides?: Partial<typeof TEST_DEVICE>,
): Promise<any> {
  const deviceData = { ...TEST_DEVICE, ...deviceOverrides };
  const res = await request(app.getHttpServer())
    .post('/api/v1/devices')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(deviceData);

  if (res.status !== 201) {
    throw new Error(`Failed to create test device: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.data;
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  await cleanupDatabase(app);
  await app.close();
}
