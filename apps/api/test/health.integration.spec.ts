import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp } from './integration-test-utils';

describe('Health (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
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
