import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationService } from '../organization.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-token'),
}));

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: any;
  let redisService: any;

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    invitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    device: {
      count: jest.fn(),
    },
    alert: {
      count: jest.fn(),
    },
    usageRecord: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return org with owner info', async () => {
      const mockOrg = {
        id: 'org_001',
        name: 'Test Org',
        owner: { id: 'user_001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        _count: { devices: 10, memberships: 5 },
      };

      prisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.findOne('org_001');

      expect(result).toEqual(mockOrg);
      expect(result.owner).toBeDefined();
      expect(result._count.devices).toBe(10);
      expect(result._count.memberships).toBe(5);
    });

    it('should throw NotFoundException for non-existent organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update name and invalidate cache', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org_001', settings: {} });
      prisma.organization.update.mockResolvedValue({ id: 'org_001', name: 'Updated Org' });

      const result = await service.update('org_001', { name: 'Updated Org' } as any);

      expect(result.name).toBe('Updated Org');
      expect(redisService.del).toHaveBeenCalledWith('org:org_001');
    });

    it('should throw NotFoundException for non-existent organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should merge settings with existing', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org_001',
        settings: { timezone: 'UTC', theme: 'dark' },
      });
      prisma.organization.update.mockResolvedValue({ id: 'org_001' });

      await service.update('org_001', { settings: { timezone: 'PST' } } as any);

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: { timezone: 'PST', theme: 'dark' },
          }),
        }),
      );
    });

    it('should update logoUrl', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org_001' });
      prisma.organization.update.mockResolvedValue({ id: 'org_001' });

      await service.update('org_001', { logoUrl: 'https://example.com/logo.png' } as any);

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            logoUrl: 'https://example.com/logo.png',
          }),
        }),
      );
    });
  });

  describe('getMembers', () => {
    it('should return paginated members', async () => {
      const mockMembers = [
        {
          id: 'mem_001',
          role: 'OWNER',
          user: { id: 'user_001', email: 'john@test.com', firstName: 'John', lastName: 'Doe' },
        },
      ];

      prisma.membership.findMany.mockResolvedValue(mockMembers);
      prisma.membership.count.mockResolvedValue(5);

      const result = await service.getMembers('org_001', 1, 10);

      expect(result.data).toEqual(mockMembers);
      expect(result.meta.total).toBe(5);
      expect(result.meta.page).toBe(1);
    });

    it('should calculate pagination correctly', async () => {
      prisma.membership.findMany.mockResolvedValue([]);
      prisma.membership.count.mockResolvedValue(25);

      const result = await service.getMembers('org_001', 2, 10);

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
    });
  });

  describe('inviteMember', () => {
    it('should create invitation', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue({
        id: 'inv_001',
        email: 'new@test.com',
        role: 'MEMBER',
        status: 'PENDING',
        expiresAt: new Date(),
        organization: { name: 'Test Org', slug: 'test-org' },
      });

      const result = await service.inviteMember('org_001', 'user_001', {
        email: 'new@test.com',
        role: 'MEMBER' as any,
      });

      expect(result.email).toBe('new@test.com');
      expect(result.status).toBe('PENDING');
      expect(prisma.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@test.com',
            organizationId: 'org_001',
            role: 'MEMBER',
            token: 'mock-uuid-token',
          }),
        }),
      );
    });

    it('should reject duplicate pending invitation', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue({
        id: 'inv_existing',
        status: 'PENDING',
      });

      await expect(
        service.inviteMember('org_001', 'user_001', {
          email: 'existing@test.com',
          role: 'MEMBER' as any,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.inviteMember('org_001', 'user_001', {
          email: 'existing@test.com',
          role: 'MEMBER' as any,
        }),
      ).rejects.toThrow('A pending invitation already exists for this email');
    });

    it('should reject if user is already an active member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_002' });
      prisma.membership.findUnique.mockResolvedValue({ id: 'mem_002', isActive: true });

      await expect(
        service.inviteMember('org_001', 'user_001', {
          email: 'member@test.com',
          role: 'MEMBER' as any,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.inviteMember('org_001', 'user_001', {
          email: 'member@test.com',
          role: 'MEMBER' as any,
        }),
      ).rejects.toThrow('User is already a member');
    });

    it('should allow invitation when user exists but has inactive membership', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_002' });
      prisma.membership.findUnique.mockResolvedValue({ id: 'mem_002', isActive: false });
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue({
        id: 'inv_002',
        email: 'inactive@test.com',
        status: 'PENDING',
        expiresAt: new Date(),
        organization: { name: 'Test Org', slug: 'test-org' },
      });

      const result = await service.inviteMember('org_001', 'user_001', {
        email: 'inactive@test.com',
        role: 'MEMBER' as any,
      });

      expect(result).toBeDefined();
    });
  });

  describe('updateMemberRole', () => {
    it('should protect OWNER role', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem_001',
        role: 'OWNER',
        organizationId: 'org_001',
      });

      await expect(
        service.updateMemberRole('org_001', 'mem_001', { role: 'ADMIN' as any }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateMemberRole('org_001', 'mem_001', { role: 'ADMIN' as any }),
      ).rejects.toThrow('Cannot change the owner role');
    });

    it('should update role for non-OWNER members', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem_002',
        role: 'MEMBER',
        organizationId: 'org_001',
      });
      prisma.membership.update.mockResolvedValue({
        id: 'mem_002',
        role: 'ADMIN',
        user: { id: 'user_002', email: 'test@test.com' },
      });

      const result = await service.updateMemberRole('org_001', 'mem_002', {
        role: 'ADMIN' as any,
      });

      expect(result.role).toBe('ADMIN');
    });

    it('should throw NotFoundException for membership in wrong org', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem_003',
        role: 'MEMBER',
        organizationId: 'org_other',
      });

      await expect(
        service.updateMemberRole('org_001', 'mem_003', { role: 'ADMIN' as any }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent membership', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole('org_001', 'nonexistent', { role: 'ADMIN' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should protect OWNER', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem_001',
        role: 'OWNER',
        organizationId: 'org_001',
      });

      await expect(
        service.removeMember('org_001', 'mem_001'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.removeMember('org_001', 'mem_001'),
      ).rejects.toThrow('Cannot remove the organization owner');
    });

    it('should soft-delete member', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem_002',
        role: 'MEMBER',
        organizationId: 'org_001',
      });
      prisma.membership.update.mockResolvedValue({ id: 'mem_002', isActive: false });

      const result = await service.removeMember('org_001', 'mem_002');

      expect(result.message).toBe('Member removed successfully');
      expect(prisma.membership.update).toHaveBeenCalledWith({
        where: { id: 'mem_002' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException for membership in wrong org', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem_003',
        role: 'MEMBER',
        organizationId: 'org_other',
      });

      await expect(
        service.removeMember('org_001', 'mem_003'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    it('should create membership', async () => {
      const mockInvitation = {
        id: 'inv_001',
        email: 'new@test.com',
        role: 'MEMBER',
        status: 'PENDING',
        organizationId: 'org_001',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        organization: { id: 'org_001', name: 'Test Org', slug: 'test-org' },
      };

      prisma.invitation.findUnique.mockResolvedValue(mockInvitation);
      prisma.membership.findUnique.mockResolvedValue(null);

      // Mock transaction to execute callback
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          invitation: { update: jest.fn().mockResolvedValue({}) },
          membership: { create: jest.fn().mockResolvedValue({ id: 'mem_new' }) },
          organization: {
            findUnique: jest.fn().mockResolvedValue({ id: 'org_001', name: 'Test Org', slug: 'test-org' }),
          },
        };
        return cb(tx);
      });

      const result = await service.acceptInvitation('mock-token', 'user_new');

      expect(result.message).toBe('Invitation accepted');
      expect(result.organization).toEqual({ id: 'org_001', name: 'Test Org', slug: 'test-org' });
    });

    it('should throw NotFoundException for invalid token', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvitation('invalid-token', 'user_001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject expired invitation', async () => {
      const expiredInvitation = {
        id: 'inv_001',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000), // expired
        organizationId: 'org_001',
      };

      prisma.invitation.findUnique.mockResolvedValue(expiredInvitation);
      prisma.invitation.update.mockResolvedValue({});

      await expect(
        service.acceptInvitation('expired-token', 'user_001'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acceptInvitation('expired-token', 'user_001'),
      ).rejects.toThrow('Invitation has expired');
    });

    it('should reject already-accepted invitation', async () => {
      const acceptedInvitation = {
        id: 'inv_001',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organizationId: 'org_001',
      };

      prisma.invitation.findUnique.mockResolvedValue(acceptedInvitation);

      await expect(
        service.acceptInvitation('accepted-token', 'user_001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reactivate existing inactive membership', async () => {
      const mockInvitation = {
        id: 'inv_001',
        email: 'returning@test.com',
        role: 'ADMIN',
        status: 'PENDING',
        organizationId: 'org_001',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organization: { id: 'org_001', name: 'Test Org', slug: 'test-org' },
      };

      prisma.invitation.findUnique.mockResolvedValue(mockInvitation);
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem_existing',
        isActive: false,
      });

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          invitation: { update: jest.fn().mockResolvedValue({}) },
          membership: { update: jest.fn().mockResolvedValue({}) },
          organization: {
            findUnique: jest.fn().mockResolvedValue({ id: 'org_001', name: 'Test Org', slug: 'test-org' }),
          },
        };
        return cb(tx);
      });

      const result = await service.acceptInvitation('mock-token', 'user_returning');

      expect(result.message).toBe('Invitation accepted');
    });
  });

  describe('declineInvitation', () => {
    it('should set status', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_001',
        status: 'PENDING',
        email: 'test@test.com',
      });
      prisma.invitation.update.mockResolvedValue({ id: 'inv_001', status: 'DECLINED' });

      const result = await service.declineInvitation('mock-token');

      expect(result.message).toBe('Invitation declined');
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv_001' },
        data: { status: 'DECLINED' },
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.declineInvitation('invalid-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if invitation already processed', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_001',
        status: 'ACCEPTED',
      });

      await expect(
        service.declineInvitation('mock-token'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUsageStats', () => {
    it('should return counts', async () => {
      prisma.device.count.mockResolvedValue(10);
      prisma.membership.count.mockResolvedValue(5);
      prisma.alert.count.mockResolvedValue(3);
      prisma.usageRecord.findFirst.mockResolvedValue({
        telemetryCount: 1000,
        apiCalls: 500,
        aiQueries: 50,
        storageUsedMb: 256,
      });
      prisma.organization.findUnique.mockResolvedValue({
        deviceLimit: 50,
        plan: 'PRO',
      });

      const result = await service.getUsageStats('org_001');

      expect(result.devices.count).toBe(10);
      expect(result.devices.limit).toBe(50);
      expect(result.devices.percentUsed).toBe(20); // 10/50 * 100
      expect(result.members).toBe(5);
      expect(result.activeAlerts).toBe(3);
      expect(result.recentUsage.telemetryCount).toBe(1000);
      expect(result.plan).toBe('PRO');
    });

    it('should handle missing organization gracefully', async () => {
      prisma.device.count.mockResolvedValue(0);
      prisma.membership.count.mockResolvedValue(0);
      prisma.alert.count.mockResolvedValue(0);
      prisma.usageRecord.findFirst.mockResolvedValue(null);
      prisma.organization.findUnique.mockResolvedValue(null);

      const result = await service.getUsageStats('nonexistent');

      expect(result.devices.limit).toBe(5); // default
      expect(result.plan).toBe('FREE');
      expect(result.recentUsage.telemetryCount).toBe(0);
      expect(result.devices.percentUsed).toBe(0);
    });
  });
});
