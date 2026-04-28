import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AlertService } from '../alert.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

describe('AlertService', () => {
  let service: AlertService;
  let prisma: any;
  let redisService: any;

  const mockPrisma = {
    alertRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    alert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    it('should validate condition has field+operator', async () => {
      const createDto = {
        name: 'Test Rule',
        condition: { field: 'temperature' }, // missing operator
        severity: 'WARNING',
      };

      await expect(
        service.createRule('org_001', createDto as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createRule('org_001', createDto as any),
      ).rejects.toThrow('Alert condition must include "field" and "operator"');
    });

    it('should validate condition has field', async () => {
      const createDto = {
        name: 'Test Rule',
        condition: { operator: 'greaterThan' }, // missing field
        severity: 'WARNING',
      };

      await expect(
        service.createRule('org_001', createDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create rule and invalidate cache', async () => {
      const createDto = {
        name: 'High Temp',
        description: 'Alert on high temperature',
        condition: { field: 'temperature', operator: 'greaterThan', threshold: 90 },
        severity: 'CRITICAL',
        isActive: true,
      };

      const mockRule = { id: 'rule_001', ...createDto, organizationId: 'org_001' };
      prisma.alertRule.create.mockResolvedValue(mockRule);

      const result = await service.createRule('org_001', createDto as any);

      expect(result).toEqual(mockRule);
      expect(redisService.del).toHaveBeenCalledWith('alert_rules:org_001');
    });

    it('should default isActive to true when not specified', async () => {
      const createDto = {
        name: 'Test Rule',
        condition: { field: 'temp', operator: 'greaterThan', threshold: 50 },
        severity: 'WARNING',
      };

      prisma.alertRule.create.mockResolvedValue({ id: 'rule_001', isActive: true });

      await service.createRule('org_001', createDto as any);

      expect(prisma.alertRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('getRules', () => {
    it('should return paginated rules', async () => {
      const mockRules = [
        { id: 'rule_001', name: 'Rule 1', _count: { alerts: 5 } },
        { id: 'rule_002', name: 'Rule 2', _count: { alerts: 2 } },
      ];

      prisma.alertRule.findMany.mockResolvedValue(mockRules);
      prisma.alertRule.count.mockResolvedValue(2);

      const result = await service.getRules('org_001', { page: 1, limit: 10 });

      expect(result.data).toEqual(mockRules);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    it('should filter by isActive when provided', async () => {
      prisma.alertRule.findMany.mockResolvedValue([]);
      prisma.alertRule.count.mockResolvedValue(0);

      await service.getRules('org_001', { page: 1, limit: 10, isActive: true });

      expect(prisma.alertRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should calculate pagination correctly', async () => {
      prisma.alertRule.findMany.mockResolvedValue([]);
      prisma.alertRule.count.mockResolvedValue(25);

      const result = await service.getRules('org_001', { page: 2, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
    });
  });

  describe('updateRule', () => {
    it('should update and invalidate cache', async () => {
      prisma.alertRule.findFirst.mockResolvedValue({ id: 'rule_001', organizationId: 'org_001' });
      const updated = { id: 'rule_001', name: 'Updated Rule' };
      prisma.alertRule.update.mockResolvedValue(updated);

      const result = await service.updateRule('org_001', 'rule_001', { name: 'Updated Rule' } as any);

      expect(result).toEqual(updated);
      expect(redisService.del).toHaveBeenCalledWith('alert_rules:org_001');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      prisma.alertRule.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRule('org_001', 'nonexistent', { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only update provided fields', async () => {
      prisma.alertRule.findFirst.mockResolvedValue({ id: 'rule_001', organizationId: 'org_001' });
      prisma.alertRule.update.mockResolvedValue({ id: 'rule_001' });

      await service.updateRule('org_001', 'rule_001', { name: 'New Name' } as any);

      expect(prisma.alertRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
    });
  });

  describe('deleteRule', () => {
    it('should delete and invalidate cache', async () => {
      prisma.alertRule.findFirst.mockResolvedValue({ id: 'rule_001', organizationId: 'org_001' });
      prisma.alertRule.delete.mockResolvedValue({ id: 'rule_001' });

      const result = await service.deleteRule('org_001', 'rule_001');

      expect(result.message).toBe('Alert rule deleted successfully');
      expect(prisma.alertRule.delete).toHaveBeenCalledWith({ where: { id: 'rule_001' } });
      expect(redisService.del).toHaveBeenCalledWith('alert_rules:org_001');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      prisma.alertRule.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteRule('org_001', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAlerts', () => {
    it('should return paginated alerts with filters', async () => {
      const mockAlerts = [
        {
          id: 'alert_001',
          title: 'High Temp',
          device: { id: 'dev_1', name: 'Sensor', serialNumber: 'SN1', type: 'TEMP' },
          rule: { id: 'rule_1', name: 'Temp Rule', severity: 'CRITICAL' },
          acknowledgedByUser: null,
        },
      ];

      prisma.alert.findMany.mockResolvedValue(mockAlerts);
      prisma.alert.count.mockResolvedValue(1);

      const result = await service.getAlerts('org_001', {
        page: 1,
        limit: 10,
        status: 'ACTIVE' as any,
        severity: 'CRITICAL' as any,
      });

      expect(result.data).toEqual(mockAlerts);
      expect(result.meta.total).toBe(1);
      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_001',
            status: 'ACTIVE',
            severity: 'CRITICAL',
          }),
        }),
      );
    });

    it('should filter by deviceId when provided', async () => {
      prisma.alert.findMany.mockResolvedValue([]);
      prisma.alert.count.mockResolvedValue(0);

      await service.getAlerts('org_001', {
        page: 1,
        limit: 10,
        deviceId: 'device_001',
      });

      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deviceId: 'device_001' }),
        }),
      );
    });
  });

  describe('acknowledgeAlert', () => {
    it('should set acknowledgedBy', async () => {
      prisma.alert.findFirst.mockResolvedValue({
        id: 'alert_001',
        status: 'ACTIVE',
        metadata: {},
      });
      const updatedAlert = {
        id: 'alert_001',
        status: 'ACKNOWLEDGED',
        acknowledgedBy: 'user_001',
      };
      prisma.alert.update.mockResolvedValue(updatedAlert);

      const result = await service.acknowledgeAlert('org_001', 'user_001', 'alert_001', 'Looking into it');

      expect(result.status).toBe('ACKNOWLEDGED');
      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACKNOWLEDGED',
            acknowledgedBy: 'user_001',
          }),
        }),
      );
    });

    it('should reject for resolved alerts', async () => {
      prisma.alert.findFirst.mockResolvedValue({
        id: 'alert_001',
        status: 'RESOLVED',
      });

      await expect(
        service.acknowledgeAlert('org_001', 'user_001', 'alert_001'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acknowledgeAlert('org_001', 'user_001', 'alert_001'),
      ).rejects.toThrow('Cannot acknowledge a resolved alert');
    });

    it('should throw NotFoundException for non-existent alert', async () => {
      prisma.alert.findFirst.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert('org_001', 'user_001', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include acknowledge note in metadata when provided', async () => {
      prisma.alert.findFirst.mockResolvedValue({
        id: 'alert_001',
        status: 'ACTIVE',
        metadata: {},
      });
      prisma.alert.update.mockResolvedValue({ id: 'alert_001' });

      await service.acknowledgeAlert('org_001', 'user_001', 'alert_001', 'Investigating');

      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ acknowledgeNote: 'Investigating' }),
          }),
        }),
      );
    });
  });

  describe('resolveAlert', () => {
    it('should set resolvedAt', async () => {
      prisma.alert.findFirst.mockResolvedValue({ id: 'alert_001' });
      prisma.alert.update.mockResolvedValue({ id: 'alert_001', status: 'RESOLVED' });

      const result = await service.resolveAlert('org_001', 'alert_001');

      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RESOLVED',
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent alert', async () => {
      prisma.alert.findFirst.mockResolvedValue(null);

      await expect(
        service.resolveAlert('org_001', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('evaluateAlertRules', () => {
    it('should evaluate conditions correctly', async () => {
      // Test cached rules path
      const cachedRules = JSON.stringify([
        {
          id: 'rule_001',
          name: 'High Temp',
          severity: 'CRITICAL',
          condition: { field: 'temperature', operator: 'greaterThan', threshold: 90 },
          isActive: true,
        },
      ]);
      redisService.get.mockResolvedValue(cachedRules);

      // No existing active alert -> should create one
      prisma.alert.findFirst.mockResolvedValue(null);
      prisma.alert.create.mockResolvedValue({
        id: 'alert_new',
        title: 'Alert: High Temp',
        createdAt: new Date(),
      });

      await service.evaluateAlertRules('org_001', 'device_001', { temperature: 95 });

      expect(prisma.alert.create).toHaveBeenCalled();
    });

    it('should not create duplicate alerts when one already exists', async () => {
      const cachedRules = JSON.stringify([
        {
          id: 'rule_001',
          name: 'High Temp',
          severity: 'CRITICAL',
          condition: { field: 'temperature', operator: 'greaterThan', threshold: 90 },
        },
      ]);
      redisService.get.mockResolvedValue(cachedRules);
      prisma.alert.findFirst.mockResolvedValue({ id: 'existing_alert', status: 'ACTIVE' });

      await service.evaluateAlertRules('org_001', 'device_001', { temperature: 95 });

      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('should load rules from database when not cached', async () => {
      redisService.get.mockResolvedValue(null);
      prisma.alertRule.findMany.mockResolvedValue([]);
      redisService.set.mockResolvedValue(undefined);

      await service.evaluateAlertRules('org_001', 'device_001', { temperature: 50 });

      expect(prisma.alertRule.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_001', isActive: true },
      });
      expect(redisService.set).toHaveBeenCalledWith(
        'alert_rules:org_001',
        JSON.stringify([]),
        300,
      );
    });

    it('should handle rule evaluation errors gracefully', async () => {
      const cachedRules = JSON.stringify([
        {
          id: 'rule_bad',
          name: 'Bad Rule',
          severity: 'CRITICAL',
          condition: { field: 'temperature', operator: 'unknownOp', threshold: 90 },
        },
      ]);
      redisService.get.mockResolvedValue(cachedRules);

      // Should not throw, just log the error
      await expect(
        service.evaluateAlertRules('org_001', 'device_001', { temperature: 95 }),
      ).resolves.toBeUndefined();
    });

    it('should support all operators', async () => {
      // Test greaterThan
      const testOperator = async (
        operator: string,
        value: number,
        threshold: number,
        expected: boolean,
      ) => {
        redisService.get.mockResolvedValue(
          JSON.stringify([
            {
              id: `rule_${operator}`,
              name: `Test ${operator}`,
              severity: 'WARNING',
              condition: { field: 'temp', operator, threshold },
            },
          ]),
        );
        prisma.alert.findFirst.mockResolvedValue(null);
        prisma.alert.create.mockResolvedValue({ id: 'a1', createdAt: new Date() });
        prisma.alertRule.update.mockResolvedValue({});

        await service.evaluateAlertRules('org_001', 'device_001', { temp: value });

        if (expected) {
          expect(prisma.alert.create).toHaveBeenCalled();
        } else {
          expect(prisma.alert.create).not.toHaveBeenCalled();
        }
        jest.clearAllMocks();
      };

      await testOperator('greaterThan', 95, 90, true);
      await testOperator('greaterThan', 85, 90, false);
      await testOperator('lessThan', 85, 90, true);
      await testOperator('lessThan', 95, 90, false);
      await testOperator('greaterThanOrEqual', 90, 90, true);
      await testOperator('greaterThanOrEqual', 89, 90, false);
      await testOperator('lessThanOrEqual', 90, 90, true);
      await testOperator('lessThanOrEqual', 91, 90, false);
      await testOperator('equals', 90, 90, true);
      await testOperator('equals', 91, 90, false);
      await testOperator('notEquals', 91, 90, true);
      await testOperator('notEquals', 90, 90, false);
    });

    it('should handle dot-notation field paths', async () => {
      redisService.get.mockResolvedValue(
        JSON.stringify([
          {
            id: 'rule_dot',
            name: 'Nested Field',
            severity: 'WARNING',
            condition: { field: 'system.cpu.usage', operator: 'greaterThan', threshold: 80 },
          },
        ]),
      );
      prisma.alert.findFirst.mockResolvedValue(null);
      prisma.alert.create.mockResolvedValue({ id: 'a1', createdAt: new Date() });
      prisma.alertRule.update.mockResolvedValue({});

      await service.evaluateAlertRules('org_001', 'device_001', {
        system: { cpu: { usage: 95 } },
      });

      expect(prisma.alert.create).toHaveBeenCalled();
    });

    it('should handle null metric value gracefully', async () => {
      redisService.get.mockResolvedValue(
        JSON.stringify([
          {
            id: 'rule_null',
            name: 'Null Check',
            severity: 'WARNING',
            condition: { field: 'temperature', operator: 'greaterThan', threshold: 90 },
          },
        ]),
      );

      // temperature is null -> should not trigger
      await service.evaluateAlertRules('org_001', 'device_001', { temperature: null });
      expect(prisma.alert.create).not.toHaveBeenCalled();
    });
  });
});
