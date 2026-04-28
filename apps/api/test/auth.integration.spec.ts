import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
  TEST_USER,
} from './integration-test-utils';

describe('Auth (integration)', () => {
  let app: INestApplication;
  let testUser: Awaited<ReturnType<typeof registerTestUser>>;

  beforeAll(async () => {
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      testUser = await registerTestUser(app);

      expect(testUser.accessToken).toBeDefined();
      expect(testUser.refreshToken).toBeDefined();
      expect(testUser.userId).toBeDefined();
      expect(testUser.organizationId).toBeDefined();
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(TEST_USER)
        .expect(400);
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'TestP@ss1234',
          firstName: 'Bad',
          lastName: 'Email',
          organizationName: 'Bad Org',
        })
        .expect(400);
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `weak-${Date.now()}@test.com`,
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Pass',
          organizationName: 'Weak Org',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data.user.email).toBe(TEST_USER.email);
          testUser.accessToken = res.body.data.accessToken;
          testUser.refreshToken = res.body.data.refreshToken;
        });
    });

    it('should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'WrongPassword1' })
        .expect(401);
    });

    it('should reject non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'Whatever123' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: testUser.refreshToken })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          testUser.accessToken = res.body.data.accessToken;
          testUser.refreshToken = res.body.data.refreshToken;
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.email).toBe(TEST_USER.email);
          expect(res.body.data).toHaveProperty('memberships');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);
    });
  });
});
