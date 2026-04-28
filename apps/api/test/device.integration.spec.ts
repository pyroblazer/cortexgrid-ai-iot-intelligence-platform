import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
  createTestDevice,
  TEST_DEVICE,
} from './integration-test-utils';

describe('Device (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let deviceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST /devices', () => {
    it('should create a device', async () => {
      const device = await createTestDevice(app, accessToken);
      expect(device.name).toBe(TEST_DEVICE.name);
      expect(device.type).toBe('SENSOR');
      expect(device.serialNumber).toBe(TEST_DEVICE.serialNumber);
      deviceId = device.id;
    });

    it('should reject duplicate serial number', () => {
      return request(app.getHttpServer())
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(TEST_DEVICE)
        .expect(400);
    });

    it('should reject invalid device type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bad Device',
          type: 'INVALID_TYPE',
          serialNumber: `SN-${Date.now()}`,
        })
        .expect(400);
    });
  });

  describe('GET /devices', () => {
    it('should list devices with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          // Paginated: TransformInterceptor returns { success, data: [...], meta }
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('page');
        });
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices?status=ONLINE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices')
        .expect(401);
    });
  });

  describe('GET /devices/:id', () => {
    it('should return a single device', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.id).toBe(deviceId);
          expect(res.body.data.name).toBe(TEST_DEVICE.name);
        });
    });

    it('should return 404 for non-existent device', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /devices/:id/status', () => {
    it('should return device status', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/devices/${deviceId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('PATCH /devices/:id', () => {
    it('should update a device', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Sensor', location: 'New Location' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.name).toBe('Updated Sensor');
          expect(res.body.data.location).toBe('New Location');
        });
    });
  });

  describe('DELETE /devices/:id', () => {
    it('should soft-delete a device', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('deleted device should not appear in list', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
