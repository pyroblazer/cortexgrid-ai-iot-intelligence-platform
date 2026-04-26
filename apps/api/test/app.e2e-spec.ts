import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CortexGrid API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let deviceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('services');
        });
    });
  });

  describe('Authentication', () => {
    const testUser = {
      email: `e2e-test-${Date.now()}@cortexgrid.io`,
      password: 'TestP@ss1234',
      firstName: 'E2E',
      lastName: 'Tester',
      organizationName: 'E2E Test Org',
    };

    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          accessToken = res.body.data.accessToken;
        });
    });

    it('should login with registered user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          accessToken = res.body.data.accessToken;
        });
    });

    it('should get current user profile', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.email).toBe(testUser.email);
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  describe('Devices', () => {
    const testDevice = {
      name: 'E2E Temperature Sensor',
      type: 'SENSOR',
      serialNumber: `E2E-SN-${Date.now()}`,
      firmwareVersion: '1.0.0',
      location: 'Server Room A',
      tags: ['temperature', 'e2e'],
      profile: {
        manufacturer: 'TestCorp',
        model: 'TS-100',
        metrics: [
          { key: 'temperature', unit: 'celsius', type: 'number', min: -40, max: 85 },
        ],
      },
    };

    it('should create a device', () => {
      return request(app.getHttpServer())
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice)
        .expect(201)
        .expect((res) => {
          expect(res.body.data.name).toBe(testDevice.name);
          expect(res.body.data.type).toBe('SENSOR');
          deviceId = res.body.data.id;
        });
    });

    it('should list devices', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should get a specific device', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.id).toBe(deviceId);
        });
    });

    it('should update a device', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated E2E Sensor' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.name).toBe('Updated E2E Sensor');
        });
    });
  });

  describe('Telemetry', () => {
    it('should ingest telemetry data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          metrics: { temperature: 23.5, humidity: 65 },
          timestamp: new Date().toISOString(),
        })
        .expect(201);
    });

    it('should query telemetry for a device', () => {
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const end = new Date().toISOString();
      return request(app.getHttpServer())
        .get(`/api/v1/telemetry/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ start, end })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('should get latest telemetry', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/telemetry/latest/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Alerts', () => {
    it('should create an alert rule', () => {
      return request(app.getHttpServer())
        .post('/api/v1/alerts/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'High Temperature Alert',
          description: 'Alert when temperature exceeds 30C',
          condition: { metric: 'temperature', operator: 'gt', threshold: 30 },
          severity: 'WARNING',
        })
        .expect(201);
    });

    it('should list alert rules', () => {
      return request(app.getHttpServer())
        .get('/api/v1/alerts/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should list alerts', () => {
      return request(app.getHttpServer())
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('AI', () => {
    it('should handle a natural language query', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'What is the average temperature across all devices?' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('answer');
        });
    });

    it('should run anomaly detection', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ai/anomaly-detection')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          metric: 'temperature',
          timeRange: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        })
        .expect(200);
    });

    it('should generate telemetry summary', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ai/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceIds: [deviceId],
          timeRange: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        })
        .expect(200);
    });
  });

  describe('Notifications', () => {
    it('should list notifications', () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Billing', () => {
    it('should get current subscription', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/subscription')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
