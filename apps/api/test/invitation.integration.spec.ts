import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerTestUser,
} from './integration-test-utils';

describe('Invitation Accept/Decline (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let organizationId: string;
  let inviteToken: string;
  let inviteEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerTestUser(app);
    accessToken = user.accessToken;
    organizationId = user.organizationId;
    inviteEmail = `invitee-${Date.now()}@test.com`;
  }, 30000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('Invitation flow', () => {
    it('should create an invitation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/organizations/current/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteEmail, role: 'MEMBER' })
        .expect(201);

      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should list the invitation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/organizations/current/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      const invitation = res.body.data.find((inv: any) => inv.email === inviteEmail);
      expect(invitation).toBeDefined();
      inviteToken = invitation.token;
    });

    it('should preview the invitation by token', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/organizations/invitations/${inviteToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('organizationName');
          expect(res.body.data).toHaveProperty('role');
          expect(res.body.data).toHaveProperty('email');
          expect(res.body.data.email).toBe(inviteEmail);
        });
    });

    it('should return 404 for invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/organizations/invitations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should decline the invitation', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/organizations/invitations/${inviteToken}/decline`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.message).toBe('Invitation declined');
        });
    });

    it('should not allow accepting a declined invitation', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/organizations/invitations/${inviteToken}/accept`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('Accept flow', () => {
    let acceptToken: string;
    let acceptEmail: string;
    let acceptUser: { accessToken: string; userId: string };

    beforeAll(async () => {
      // Create a second user who will accept the invitation
      acceptEmail = `accepter-${Date.now()}@test.com`;
      acceptUser = await registerTestUser(app, {
        email: acceptEmail,
        firstName: 'Accepter',
        lastName: 'User',
        organizationName: `Accepter Org ${Date.now()}`,
      });

      // Create invitation from the first org
      const res = await request(app.getHttpServer())
        .post('/api/v1/organizations/current/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: acceptEmail, role: 'MEMBER' })
        .expect(201);

      // Get the token
      const invitations = await request(app.getHttpServer())
        .get('/api/v1/organizations/current/invitations')
        .set('Authorization', `Bearer ${accessToken}`);

      const invitation = invitations.body.data.find((inv: any) => inv.email === acceptEmail);
      acceptToken = invitation.token;
    });

    it('should accept the invitation and add membership', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/organizations/invitations/${acceptToken}/accept`)
        .set('Authorization', `Bearer ${acceptUser.accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.message).toBe('Invitation accepted');
          expect(res.body.data.organization).toHaveProperty('name');
        });
    });

    it('should not accept the same invitation twice', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/organizations/invitations/${acceptToken}/accept`)
        .set('Authorization', `Bearer ${acceptUser.accessToken}`)
        .expect(400);
    });
  });
});
