import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationService } from '../notification.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;
  let redisService: any;

  const mockPrisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    hset: jest.fn().mockResolvedValue(undefined),
    hget: jest.fn().mockResolvedValue(null),
    hgetall: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: 'notif_001', title: 'Alert', message: 'High temp', isRead: false },
        { id: 'notif_002', title: 'Info', message: 'Device online', isRead: true },
      ];

      prisma.notification.findMany.mockResolvedValue(mockNotifications);
      prisma.notification.count.mockResolvedValue(2);

      const result = await service.findAll('user_001', 'org_001', { page: 1, pageSize: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotifications);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should calculate pagination correctly', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(25);

      const result = await service.findAll('user_001', 'org_001', { page: 1, pageSize: 10 });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasMore).toBe(true);
    });

    it('should skip correct records for page 2', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAll('user_001', 'org_001', { page: 2, pageSize: 10 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user_001');

      expect(result).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user_001', isRead: false },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user_001');

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should update by IDs', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const ids = ['notif_001', 'notif_002', 'notif_003'];
      const result = await service.markAsRead(ids, 'user_001');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ids },
          userId: 'user_001',
        },
        data: { isRead: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should update all for user+org', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 10 });

      await service.markAllAsRead('user_001', 'org_001');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_001', organizationId: 'org_001', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('getPreferences', () => {
    it('should return defaults when no cached preferences', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.getPreferences('user_001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        email: true,
        push: true,
        alertCritical: true,
        alertWarning: true,
        alertInfo: true,
        billing: true,
        system: true,
        deviceOffline: true,
        deviceOnline: false,
        weeklyReport: true,
      });
    });

    it('should return cached preferences', async () => {
      const cachedPrefs = JSON.stringify({
        email: false,
        push: true,
        alertCritical: true,
      });
      redisService.get.mockResolvedValue(cachedPrefs);

      const result = await service.getPreferences('user_001');

      expect(result.success).toBe(true);
      expect(result.data.email).toBe(false);
    });
  });

  describe('updatePreferences', () => {
    it('should merge and cache', async () => {
      const dto = {
        preferences: {
          email: false,
          push: false,
        },
      };

      const result = await service.updatePreferences('user_001', dto as any);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe(false);
      expect(result.data.push).toBe(false);
      // Defaults should be applied for unspecified fields
      expect(result.data.alertCritical).toBe(true);
      expect(result.data.system).toBe(true);
      expect(redisService.set).toHaveBeenCalledWith(
        'notification_prefs:user_001',
        expect.any(String),
        30 * 24 * 60 * 60,
      );
    });

    it('should use default values when preferences object is not provided', async () => {
      const dto = {};

      const result = await service.updatePreferences('user_001', dto as any);

      expect(result.data.email).toBe(true);
      expect(result.data.weeklyReport).toBe(true);
      expect(result.data.deviceOnline).toBe(false);
    });
  });

  describe('createNotification', () => {
    it('should create and publish', async () => {
      const mockNotification = {
        id: 'notif_new',
        type: 'ALERT',
        title: 'Critical Alert',
        message: 'Device overheating',
        createdAt: new Date(),
      };

      prisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: 'user_001',
        organizationId: 'org_001',
        type: 'ALERT',
        title: 'Critical Alert',
        message: 'Device overheating',
        metadata: { deviceId: 'dev_001' },
      });

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_001',
          organizationId: 'org_001',
          type: 'ALERT',
          title: 'Critical Alert',
          message: 'Device overheating',
          metadata: { deviceId: 'dev_001' },
        }),
      });
      expect(redisService.publish).toHaveBeenCalledWith(
        'notifications:user_001',
        expect.any(String),
      );

      // Verify published payload
      const publishCall = redisService.publish.mock.calls[0];
      expect(publishCall[0]).toBe('notifications:user_001');
      const payload = JSON.parse(publishCall[1]);
      expect(payload.id).toBe('notif_new');
      expect(payload.title).toBe('Critical Alert');
    });

    it('should create notification without metadata', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'notif_new2',
        createdAt: new Date(),
      });

      await service.createNotification({
        userId: 'user_001',
        organizationId: 'org_001',
        type: 'INFO',
        title: 'Info',
        message: 'Test message',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: {},
          }),
        }),
      );
    });
  });

  describe('deleteOne', () => {
    it('should check ownership and delete', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif_001',
        userId: 'user_001',
      });

      const result = await service.deleteOne('notif_001', 'user_001');

      expect(result.message).toBe('Notification deleted');
      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif_001' },
      });
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteOne('nonexistent', 'user_001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when not the owner', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif_001',
        userId: 'user_002',
      });

      await expect(
        service.deleteOne('notif_001', 'user_001'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
