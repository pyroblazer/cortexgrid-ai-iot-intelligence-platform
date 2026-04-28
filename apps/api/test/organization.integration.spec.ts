import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
} from './integration-test-utils';

describe('Organization (integration)', () => {
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

  describe('GET /organizations/current', () => {
    it('should return organization details', () => {
      return request(app.getHttpServer())
        .get('/api/v1/organizations/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('name');
          expect(res.body.data).toHaveProperty('owner');
          expect(res.body.data.plan).toBe('FREE');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/organizations/current')
        .expect(401);
    });
  });

  describe('PATCH /organizations/current', () => {
    it('should update organization name', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/organizations/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Org Name' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.name).toBe('Updated Org Name');
        });
    });
  });

  describe('GET /organizations/current/members', () => {
    it('should list members', () => {
      return request(app.getHttpServer())
        .get('/api/v1/organizations/current/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          // Paginated: { success, data: [...], meta }
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.meta).toHaveProperty('total');
        });
    });
  });

  describe('Invitation flow', () => {
    let invitationId: string;
    const inviteEmail = `invitee-${Date.now()}@test.com`;

    it('POST /organizations/current/invite — should create invitation', () => {
      return request(app.getHttpServer())
        .post('/api/v1/organizations/current/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteEmail, role: 'MEMBER' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('status');
          expect(res.body.data.status).toBe('PENDING');
          invitationId = res.body.data.id;
        });
    });

    it('should reject duplicate invitation for same email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/organizations/current/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteEmail, role: 'MEMBER' })
        .expect(400);
    });

    it('GET /organizations/current/invitations — should list invitations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/organizations/current/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('DELETE /organizations/current/invitations/:id — should cancel invitation', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/organizations/current/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 404 for already-cancelled invitation', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/organizations/current/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /organizations/current/usage', () => {
    it('should return usage stats', () => {
      return request(app.getHttpServer())
        .get('/api/v1/organizations/current/usage')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('devices');
          expect(res.body.data).toHaveProperty('members');
          expect(res.body.data).toHaveProperty('activeAlerts');
          expect(res.body.data).toHaveProperty('plan');
        });
    });
  });
});
