import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
} from './integration-test-utils';

describe('Billing (integration)', () => {
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

  describe('GET /billing/plans (public)', () => {
    it('should return available plans without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/plans')
        .expect(200)
        .expect((res: any) => {
          // Plain data: { success, data: { plans: [...] }, timestamp }
          expect(res.body.data.plans).toBeInstanceOf(Array);
          expect(res.body.data.plans.length).toBe(3);
          const plans = res.body.data.plans.map((p: any) => p.id);
          expect(plans).toContain('FREE');
          expect(plans).toContain('PRO');
          expect(plans).toContain('ENTERPRISE');
        });
    });
  });

  describe('GET /billing/subscription', () => {
    it('should return current subscription', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/subscription')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          // Plain data: { success, data: { organization, plan, usage, ... }, timestamp }
          expect(res.body.data).toHaveProperty('plan');
          expect(res.body.data.plan.type).toBe('FREE');
          expect(res.body.data).toHaveProperty('usage');
          expect(res.body.data.usage.devices).toHaveProperty('used');
          expect(res.body.data.usage.devices).toHaveProperty('limit');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/subscription')
        .expect(401);
    });
  });

  describe('GET /billing/usage', () => {
    it('should return usage records', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/usage')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          // Paginated: { success, data: [...], meta }
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body).toHaveProperty('meta');
        });
    });
  });

  describe('POST /billing/checkout', () => {
    it('should handle Stripe errors gracefully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/billing/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ plan: 'PRO' })
        .expect((res: any) => {
          // Either 400 (no Stripe key) or 500 (invalid key) — both acceptable
          expect([400, 500]).toContain(res.status);
          expect(res.body.success).toBe(false);
        });
    });
  });
});
