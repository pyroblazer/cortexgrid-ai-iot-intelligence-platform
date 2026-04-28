import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
  createTestDevice,
} from './integration-test-utils';

describe('Telemetry (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let deviceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
    const device = await createTestDevice(app, accessToken);
    deviceId = device.id;
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST /telemetry', () => {
    it('should ingest telemetry data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          metrics: { temperature: 23.5, humidity: 65 },
          timestamp: new Date().toISOString(),
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.deviceId).toBe(deviceId);
        });
    });

    it('should ingest without timestamp', () => {
      return request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId,
          metrics: { temperature: 25.0 },
        })
        .expect(201);
    });

    it('should reject non-existent device', () => {
      return request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceId: '00000000-0000-0000-0000-000000000000',
          metrics: { temperature: 20 },
        })
        .expect(404);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .send({ deviceId, metrics: { temperature: 20 } })
        .expect(401);
    });
  });

  describe('GET /telemetry/:deviceId', () => {
    it('should query telemetry for a device', () => {
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const end = new Date().toISOString();
      return request(app.getHttpServer())
        .get(`/api/v1/telemetry/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ startTime: start, endTime: end })
        .expect(200)
        .expect((res: any) => {
          // Paginated: { success, data: [...], meta }
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.meta).toHaveProperty('total');
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/telemetry/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: '1', limit: '1' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.length).toBeLessThanOrEqual(1);
        });
    });

    it('should support time aggregation query', () => {
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const end = new Date().toISOString();
      return request(app.getHttpServer())
        .get(`/api/v1/telemetry/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ startTime: start, endTime: end, interval: '1h' })
        .expect(200)
        .expect((res: any) => {
          // Paginated response with data and meta
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toHaveProperty('total');
        });
    });
  });

  describe('GET /telemetry/latest/:deviceId', () => {
    it('should return latest telemetry', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/telemetry/latest/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toBeDefined();
        });
    });
  });
});
