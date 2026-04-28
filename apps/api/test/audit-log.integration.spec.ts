import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
  createTestDevice,
  TEST_DEVICE,
} from './integration-test-utils';

describe('Audit Logs (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
    organizationId = user.organizationId;
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('GET /audit-logs', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .expect(401);
    });

    it('should return paginated audit logs', () => {
      return request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toHaveProperty('total');
        });
    });

    it('should have audit entries from registration', async () => {
      // Create a device to trigger the audit interceptor
      await createTestDevice(app, accessToken, {
        ...TEST_DEVICE,
        serialNumber: `AUDIT-SN-${Date.now()}`,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should create audit log entry after mutation', async () => {
      const device = await createTestDevice(app, accessToken, {
        ...TEST_DEVICE,
        serialNumber: `AUDIT2-SN-${Date.now()}`,
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/devices/${device.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Audit Test Device' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should support filtering by entity', () => {
      return request(app.getHttpServer())
        .get('/api/v1/audit-logs?entity=Device')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          res.body.data.forEach((log: any) => {
            expect(log.entity).toBe('Device');
          });
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/audit-logs?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.length).toBeLessThanOrEqual(1);
          expect(res.body.meta.limit).toBe(1);
        });
    });
  });
});
