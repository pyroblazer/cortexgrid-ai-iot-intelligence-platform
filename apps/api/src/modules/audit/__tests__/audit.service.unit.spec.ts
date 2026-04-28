import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    it('should create audit log', async () => {
      const entry = {
        userId: 'user_001',
        organizationId: 'org_001',
        action: 'CREATE',
        entity: 'Device',
        entityId: 'device_001',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      prisma.auditLog.create.mockResolvedValue({ id: 'log_001', ...entry });

      await service.logAction(entry);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_001',
          organizationId: 'org_001',
          action: 'CREATE',
          entity: 'Device',
          entityId: 'device_001',
          changes: {},
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      });
    });

    it('should create audit log with changes', async () => {
      const entry = {
        userId: 'user_001',
        organizationId: 'org_001',
        action: 'UPDATE',
        entity: 'Device',
        changes: { name: 'Old Name' },
      };

      prisma.auditLog.create.mockResolvedValue({ id: 'log_002' });

      await service.logAction(entry);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changes: { name: 'Old Name' },
        }),
      });
    });

    it('should default changes to empty object when not provided', async () => {
      const entry = {
        action: 'LOGIN',
        entity: 'User',
      };

      prisma.auditLog.create.mockResolvedValue({ id: 'log_003' });

      await service.logAction(entry);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ changes: {} }),
        }),
      );
    });

    it('should not throw on failure', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB connection lost'));

      // Should not throw
      await expect(
        service.logAction({
          action: 'CREATE',
          entity: 'Device',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('queryLogs', () => {
    it('should return paginated results with filters', async () => {
      const mockLogs = [
        { id: 'log_001', action: 'CREATE', entity: 'Device' },
        { id: 'log_002', action: 'UPDATE', entity: 'Device' },
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);
      prisma.auditLog.count.mockResolvedValue(25);

      const result = await service.queryLogs('org_001', { page: 1, limit: 10 });

      expect(result.data).toEqual(mockLogs);
      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    it('should use default pagination when not specified', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.queryLogs('org_001');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should filter by entity', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.queryLogs('org_001', { entity: 'Device' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entity: 'Device' }),
        }),
      );
    });

    it('should filter by action (case-insensitive contains)', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.queryLogs('org_001', { action: 'create' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: 'create', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by userId', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.queryLogs('org_001', { userId: 'user_001' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user_001' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.queryLogs('org_001', { startDate, endDate });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it('should filter by startDate only', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const startDate = new Date('2024-01-01');

      await service.queryLogs('org_001', { startDate });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate },
          }),
        }),
      );
    });

    it('should filter by endDate only', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const endDate = new Date('2024-01-31');

      await service.queryLogs('org_001', { endDate });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lte: endDate },
          }),
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.queryLogs('org_001');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply all filters together', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.queryLogs('org_001', {
        entity: 'Device',
        action: 'UPDATE',
        userId: 'user_001',
        startDate,
        endDate,
        page: 2,
        limit: 5,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_001',
            entity: 'Device',
            action: { contains: 'UPDATE', mode: 'insensitive' },
            userId: 'user_001',
            createdAt: { gte: startDate, lte: endDate },
          }),
          skip: 5,
          take: 5,
        }),
      );
    });
  });
});
