import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
} from './integration-test-utils';

describe('Notification (integration)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('GET /notifications', () => {
    it('should return paginated notifications', () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          // Notification service wraps its own response (Branch 1 passthrough)
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body).toHaveProperty('meta');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread count', () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(typeof res.body.data.count).toBe('number');
        });
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all as read', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /notifications/preferences', () => {
    it('should return default preferences', () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          // Passthrough: { success, data: { email, push, ... } }
          expect(res.body.data).toHaveProperty('email');
          expect(res.body.data).toHaveProperty('push');
          expect(res.body.data).toHaveProperty('alertCritical');
        });
    });
  });

  describe('PUT /notifications/preferences', () => {
    it('should update preferences', () => {
      return request(app.getHttpServer())
        .put('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          preferences: {
            email: false,
            push: true,
            alertCritical: true,
          },
        })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.email).toBe(false);
          expect(res.body.data.push).toBe(true);
        });
    });
  });
});
