import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
} from './integration-test-utils';

describe('Notification CRUD (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let notificationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('DELETE /notifications/:id', () => {
    it('should return 404 for non-existent notification', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/notifications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/notifications/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });
  });
});
