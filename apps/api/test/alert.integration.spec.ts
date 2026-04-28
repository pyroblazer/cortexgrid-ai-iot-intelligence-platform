import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
} from './integration-test-utils';

describe('Alert (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ruleId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('Alert Rules CRUD', () => {
    it('POST /alerts/rules — should create an alert rule', () => {
      return request(app.getHttpServer())
        .post('/api/v1/alerts/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'High Temperature Alert',
          description: 'Alert when temperature exceeds 30C',
          condition: { field: 'temperature', operator: 'greaterThan', threshold: 30 },
          severity: 'WARNING',
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.data.name).toBe('High Temperature Alert');
          expect(res.body.data.severity).toBe('WARNING');
          ruleId = res.body.data.id;
        });
    });

    it('should reject rule without required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/alerts/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Bad Rule' })
        .expect(400);
    });

    it('GET /alerts/rules — should list rules', () => {
      return request(app.getHttpServer())
        .get('/api/v1/alerts/rules')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          // Paginated: { success, data: [...], meta }
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.meta).toHaveProperty('total');
        });
    });

    it('GET /alerts/rules/:id — should get a single rule', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/alerts/rules/${ruleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.id).toBe(ruleId);
          expect(res.body.data).toHaveProperty('alerts');
        });
    });

    it('PATCH /alerts/rules/:id — should update a rule', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/alerts/rules/${ruleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Temperature Alert', isActive: false })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.name).toBe('Updated Temperature Alert');
          expect(res.body.data.isActive).toBe(false);
        });
    });

    it('DELETE /alerts/rules/:id — should delete a rule', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/alerts/rules/${ruleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 404 for deleted rule', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/alerts/rules/${ruleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Alerts', () => {
    it('GET /alerts — should list alerts (empty)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          // Paginated: { success, data: [...], meta }
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('GET /alerts/:id — should return 404 for non-existent alert', () => {
      return request(app.getHttpServer())
        .get('/api/v1/alerts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
