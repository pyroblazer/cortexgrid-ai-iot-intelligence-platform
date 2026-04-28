import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
  createTestDevice,
} from './integration-test-utils';

describe('AI (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let deviceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
    const device = await createTestDevice(app, accessToken);
    deviceId = device.id;

    // Ingest some telemetry for AI to analyze
    await request(app.getHttpServer())
      .post('/api/v1/telemetry')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId,
        metrics: { temperature: 22.5, humidity: 55 },
        timestamp: new Date().toISOString(),
      });
    await request(app.getHttpServer())
      .post('/api/v1/telemetry')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId,
        metrics: { temperature: 24.0, humidity: 60 },
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      });
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST /ai/query', () => {
    it('should handle natural language query', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'What is the average temperature?' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('response');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ai/query')
        .send({ query: 'test' })
        .expect(401);
    });
  });

  describe('POST /ai/anomaly-detection', () => {
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
        .expect(201)
        .expect((res: any) => {
          expect(res.body.data).toBeDefined();
        });
    });
  });

  describe('POST /ai/summary', () => {
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
        .expect(201)
        .expect((res: any) => {
          expect(res.body.data).toBeDefined();
        });
    });
  });
});
