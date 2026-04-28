import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    device: {
      count: jest.fn(),
    },
    usageRecord: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: '',
        STRIPE_PRO_PRICE_ID: '',
        STRIPE_ENTERPRISE_PRICE_ID: '',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscription', () => {
    it('should return plan details', async () => {
      const mockOrg = {
        id: 'org_001',
        name: 'Test Org',
        plan: 'PRO',
        subscriptionStatus: 'ACTIVE',
        subscriptionCurrentPeriodEnd: new Date('2024-12-31'),
        deviceLimit: 50,
        stripeCustomerId: 'cus_123',
        createdAt: new Date(),
      };

      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.device.count.mockResolvedValue(10);

      const result = await service.getSubscription('org_001');

      expect(result.organization).toEqual({ id: 'org_001', name: 'Test Org' });
      expect(result.plan.type).toBe('PRO');
      expect(result.plan.deviceLimit).toBe(50);
      expect(result.plan.telemetryRetentionDays).toBe(90);
      expect(result.plan.aiQueriesPerDay).toBe(100);
      expect(result.status).toBe('ACTIVE');
      expect(result.usage.devices.used).toBe(10);
      expect(result.usage.devices.limit).toBe(50);
      expect(result.stripeCustomerId).toBe('cus_123');
    });

    it('should throw NotFoundException for non-existent organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return FREE plan details by default', async () => {
      const mockOrg = {
        id: 'org_002',
        name: 'Free Org',
        plan: 'FREE',
        subscriptionStatus: null,
        subscriptionCurrentPeriodEnd: null,
        deviceLimit: 5,
        stripeCustomerId: null,
        createdAt: new Date(),
      };

      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.device.count.mockResolvedValue(3);

      const result = await service.getSubscription('org_002');

      expect(result.plan.type).toBe('FREE');
      expect(result.plan.deviceLimit).toBe(5);
      expect(result.plan.telemetryRetentionDays).toBe(30);
      expect(result.plan.aiQueriesPerDay).toBe(10);
    });
  });

  describe('getAvailablePlans', () => {
    it('should return 3 plans', async () => {
      const result = await service.getAvailablePlans();

      expect(result.plans).toHaveLength(3);
      expect(result.plans[0].id).toBe('FREE');
      expect(result.plans[1].id).toBe('PRO');
      expect(result.plans[2].id).toBe('ENTERPRISE');
    });

    it('should include features for each plan', async () => {
      const result = await service.getAvailablePlans();

      expect(result.plans[0].features.length).toBeGreaterThan(0);
      expect(result.plans[1].features.length).toBeGreaterThan(0);
      expect(result.plans[2].features.length).toBeGreaterThan(0);
    });

    it('should include pricing for paid plans', async () => {
      const result = await service.getAvailablePlans();

      expect(result.plans[0].price).toBe(0);
      expect(result.plans[1].price).toBe(29);
      expect(result.plans[2].price).toBe(99);
    });
  });

  describe('checkDeviceLimit', () => {
    it('should compute used/limit/canAdd when under limit', async () => {
      prisma.organization.findUnique.mockResolvedValue({ deviceLimit: 50 });
      prisma.device.count.mockResolvedValue(10);

      const result = await service.checkDeviceLimit('org_001');

      expect(result.used).toBe(10);
      expect(result.limit).toBe(50);
      expect(result.canAdd).toBe(true);
    });

    it('should set canAdd to false when at limit', async () => {
      prisma.organization.findUnique.mockResolvedValue({ deviceLimit: 5 });
      prisma.device.count.mockResolvedValue(5);

      const result = await service.checkDeviceLimit('org_001');

      expect(result.used).toBe(5);
      expect(result.limit).toBe(5);
      expect(result.canAdd).toBe(false);
    });

    it('should set canAdd to false when over limit', async () => {
      prisma.organization.findUnique.mockResolvedValue({ deviceLimit: 5 });
      prisma.device.count.mockResolvedValue(6);

      const result = await service.checkDeviceLimit('org_001');

      expect(result.canAdd).toBe(false);
    });

    it('should throw NotFoundException for non-existent organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.checkDeviceLimit('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUsage', () => {
    it('should return paginated usage records', async () => {
      const mockRecords = [
        { id: 'usage_001', period: new Date('2024-01-01'), telemetryCount: 1000 },
        { id: 'usage_002', period: new Date('2024-02-01'), telemetryCount: 2000 },
      ];

      prisma.usageRecord.findMany.mockResolvedValue(mockRecords);
      prisma.usageRecord.count.mockResolvedValue(15);

      const result = await service.getUsage('org_001', { page: 1, limit: 10 });

      expect(result.data).toEqual(mockRecords);
      expect(result.meta.total).toBe(15);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(2);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    it('should handle pagination correctly for page 2', async () => {
      prisma.usageRecord.findMany.mockResolvedValue([]);
      prisma.usageRecord.count.mockResolvedValue(25);

      const result = await service.getUsage('org_001', { page: 2, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
    });

    it('should skip correct number of records', async () => {
      prisma.usageRecord.findMany.mockResolvedValue([]);
      prisma.usageRecord.count.mockResolvedValue(0);

      await service.getUsage('org_001', { page: 3, limit: 10 });

      expect(prisma.usageRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('getPlanLimits', () => {
    it('should return correct limits for FREE plan', () => {
      const result = service.getPlanLimits('FREE');
      expect(result.deviceLimit).toBe(5);
      expect(result.telemetryRetentionDays).toBe(30);
      expect(result.aiQueriesPerDay).toBe(10);
    });

    it('should return correct limits for PRO plan', () => {
      const result = service.getPlanLimits('PRO');
      expect(result.deviceLimit).toBe(50);
      expect(result.telemetryRetentionDays).toBe(90);
      expect(result.aiQueriesPerDay).toBe(100);
    });

    it('should return correct limits for ENTERPRISE plan', () => {
      const result = service.getPlanLimits('ENTERPRISE');
      expect(result.deviceLimit).toBe(1000);
      expect(result.telemetryRetentionDays).toBe(365);
      expect(result.aiQueriesPerDay).toBe(-1);
    });

    it('should default to FREE for unknown plan', () => {
      const result = service.getPlanLimits('UNKNOWN' as any);
      expect(result.deviceLimit).toBe(5);
    });
  });
});
