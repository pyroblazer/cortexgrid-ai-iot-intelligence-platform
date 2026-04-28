import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
  TEST_USER,
} from './integration-test-utils';

describe('Auth Profile & Password (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;
  let email: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
    userId = user.userId;
    email = user.email;
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('PATCH /auth/me', () => {
    it('should update user profile', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated', lastName: 'Name' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.firstName).toBe('Updated');
          expect(res.body.data.lastName).toBe('Name');
        });
    });

    it('should update avatar URL', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ avatarUrl: 'https://example.com/avatar.png' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.avatarUrl).toBe('https://example.com/avatar.png');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .send({ firstName: 'Hacker' })
        .expect(401);
    });
  });

  describe('GET /auth/me/export', () => {
    it('should export all user data', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email');
          expect(res.body.data).toHaveProperty('memberships');
          expect(res.body.data).not.toHaveProperty('passwordHash');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me/export')
        .expect(401);
    });
  });

  describe('DELETE /auth/me', () => {
    it('should not delete account if user owns active org', async () => {
      return request(app.getHttpServer())
        .delete('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
        .expect((res: any) => {
          expect(res.body.message).toContain('organizations');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/auth/me')
        .expect(401);
    });
  });

  describe('PATCH /auth/me/password', () => {
    it('should change password with correct current password', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'TestP@ss1234',
          newPassword: 'NewTestP@ss5678',
        })
        .expect(200);
    });

    it('should reject wrong current password', async () => {
      // Re-login with new password since changePassword revokes refresh tokens
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'NewTestP@ss5678' });
      const newToken = loginRes.body.data.accessToken;

      return request(app.getHttpServer())
        .patch('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          currentPassword: 'WrongPassword1',
          newPassword: 'AnotherP@ss99',
        })
        .expect(401);
    });

    it('should reject weak new password', async () => {
      // Re-login again (previous test may have invalidated the token)
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'NewTestP@ss5678' });
      const newToken = loginRes.body.data.accessToken;

      return request(app.getHttpServer())
        .patch('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          currentPassword: 'NewTestP@ss5678',
          newPassword: 'weak',
        })
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/auth/me/password')
        .send({ currentPassword: 'x', newPassword: 'y' })
        .expect(401);
    });
  });
});
