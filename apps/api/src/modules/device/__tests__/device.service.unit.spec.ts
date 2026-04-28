import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceService } from '../device.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

describe('DeviceService', () => {
  let service: DeviceService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockDevice = {
    id: 'dev_001',
    organizationId: 'org_001',
    name: 'Temperature Sensor A',
    serialNumber: 'SN-001',
    type: 'SENSOR',
    status: 'ONLINE',
    profile: { manufacturer: 'TestCorp', model: 'TS-100' },
    metadata: {},
    lastSeenAt: new Date(),
    firmwareVersion: '1.0.0',
    location: 'Server Room',
    tags: ['temperature'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    device: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'New Sensor',
      type: 'SENSOR' as const,
      serialNumber: 'SN-NEW-001',
      firmwareVersion: '1.0.0',
      location: 'Building A',
      tags: ['temperature'],
      profile: {},
    };

    it('should create a device within plan limits', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        deviceLimit: 100,
        plan: 'PRO',
      });
      mockPrisma.device.count.mockResolvedValue(10);
      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue(mockDevice);

      const result = await service.create('org_001', createDto);

      expect(result).toBeDefined();
      expect(mockPrisma.device.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if device limit reached', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        deviceLimit: 5,
        plan: 'FREE',
      });
      mockPrisma.device.count.mockResolvedValue(5);

      await expect(service.create('org_001', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for duplicate serial number', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        deviceLimit: 100,
        plan: 'PRO',
      });
      mockPrisma.device.count.mockResolvedValue(10);
      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);

      await expect(service.create('org_001', createDto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated device list', async () => {
      mockPrisma.device.findMany.mockResolvedValue([mockDevice]);
      mockPrisma.device.count.mockResolvedValue(1);

      const result = await service.findAll('org_001', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply filters correctly', async () => {
      mockPrisma.device.findMany.mockResolvedValue([mockDevice]);
      mockPrisma.device.count.mockResolvedValue(1);

      await service.findAll('org_001', { page: 1, limit: 20, type: 'SENSOR' });

      expect(mockPrisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_001',
            type: 'SENSOR',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a device', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(mockDevice);

      const result = await service.findOne('org_001', 'dev_001');

      expect(result.id).toBe('dev_001');
    });

    it('should throw NotFoundException for missing device', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(null);

      await expect(service.findOne('org_001', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update device fields', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(mockDevice);
      mockPrisma.device.update.mockResolvedValue({
        ...mockDevice,
        name: 'Updated Sensor',
      });

      const result = await service.update('org_001', 'dev_001', { name: 'Updated Sensor' });

      expect(result.name).toBe('Updated Sensor');
    });
  });

  describe('remove', () => {
    it('should soft delete a device', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(mockDevice);
      mockPrisma.device.update.mockResolvedValue({ ...mockDevice, isActive: false });

      await service.remove('org_001', 'dev_001');

      expect(mockPrisma.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });
});
