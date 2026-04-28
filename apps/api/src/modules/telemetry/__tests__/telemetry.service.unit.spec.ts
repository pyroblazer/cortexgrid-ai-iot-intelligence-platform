import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TelemetryService } from '../telemetry.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let prisma: any;
  let redisService: any;

  const mockPrisma = {
    device: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    telemetry: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
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
        TelemetryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingest', () => {
    it('should verify device ownership and save', async () => {
      const device = { id: 'device_001', name: 'Sensor 1' };
      const telemetry = {
        id: 'tel_001',
        deviceId: 'device_001',
        organizationId: 'org_001',
        metrics: { temperature: 72.5 },
        timestamp: new Date(),
      };

      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.create.mockResolvedValue(telemetry);
      prisma.device.update.mockResolvedValue({ ...device, lastSeenAt: new Date() });

      const result = await service.ingest('org_001', {
        deviceId: 'device_001',
        metrics: { temperature: 72.5 },
      });

      expect(result).toEqual(telemetry);
      expect(prisma.device.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'device_001',
          organizationId: 'org_001',
          isActive: true,
        },
      });
      expect(prisma.telemetry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId: 'device_001',
            organizationId: 'org_001',
            metrics: { temperature: 72.5 },
          }),
        }),
      );
    });

    it('should throw NotFoundException for device not in org', async () => {
      prisma.device.findFirst.mockResolvedValue(null);

      await expect(
        service.ingest('org_001', {
          deviceId: 'nonexistent',
          metrics: { temperature: 72.5 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should cache latest in Redis', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.create.mockResolvedValue({ id: 'tel_001' });
      prisma.device.update.mockResolvedValue(device);

      await service.ingest('org_001', {
        deviceId: 'device_001',
        metrics: { temperature: 72.5 },
      });

      expect(redisService.set).toHaveBeenCalledWith(
        'telemetry:latest:device_001',
        expect.any(String),
        300,
      );

      const setCall = redisService.set.mock.calls[0];
      const cachedData = JSON.parse(setCall[1]);
      expect(cachedData.deviceId).toBe('device_001');
      expect(cachedData.metrics).toEqual({ temperature: 72.5 });
    });

    it('should publish telemetry to Redis channels', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.create.mockResolvedValue({ id: 'tel_001' });
      prisma.device.update.mockResolvedValue(device);

      await service.ingest('org_001', {
        deviceId: 'device_001',
        metrics: { temperature: 72.5 },
      });

      expect(redisService.publish).toHaveBeenCalledTimes(2);
      expect(redisService.publish).toHaveBeenCalledWith(
        'telemetry:org_001',
        expect.any(String),
      );
      expect(redisService.publish).toHaveBeenCalledWith(
        'telemetry_all',
        expect.any(String),
      );
    });

    it('should update device lastSeenAt', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.create.mockResolvedValue({ id: 'tel_001' });
      prisma.device.update.mockResolvedValue(device);

      await service.ingest('org_001', {
        deviceId: 'device_001',
        metrics: { temperature: 72.5 },
      });

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'device_001' },
        data: { lastSeenAt: expect.any(Date) },
      });
    });

    it('should use provided timestamp when specified', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.create.mockResolvedValue({ id: 'tel_001' });
      prisma.device.update.mockResolvedValue(device);

      const customTimestamp = '2024-01-15T10:30:00Z';

      await service.ingest('org_001', {
        deviceId: 'device_001',
        metrics: { temperature: 72.5 },
        timestamp: customTimestamp,
      });

      expect(prisma.telemetry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timestamp: new Date(customTimestamp),
          }),
        }),
      );
    });
  });

  describe('ingestFromMqtt', () => {
    it('should save without auth check', async () => {
      const telemetry = {
        id: 'tel_mqtt_001',
        deviceId: 'device_001',
        organizationId: 'org_001',
        metrics: { humidity: 45 },
        timestamp: new Date(),
      };

      prisma.telemetry.create.mockResolvedValue(telemetry);

      const result = await service.ingestFromMqtt(
        'device_001',
        'org_001',
        { humidity: 45 },
      );

      expect(result).toEqual(telemetry);
      // Should NOT check device ownership
      expect(prisma.device.findFirst).not.toHaveBeenCalled();
    });

    it('should cache latest reading in Redis', async () => {
      prisma.telemetry.create.mockResolvedValue({ id: 'tel_001' });

      await service.ingestFromMqtt('device_001', 'org_001', { temp: 25 });

      expect(redisService.set).toHaveBeenCalledWith(
        'telemetry:latest:device_001',
        expect.any(String),
        300,
      );
    });

    it('should publish to Redis', async () => {
      prisma.telemetry.create.mockResolvedValue({ id: 'tel_001' });

      await service.ingestFromMqtt('device_001', 'org_001', { temp: 25 });

      expect(redisService.publish).toHaveBeenCalledWith(
        'telemetry:org_001',
        expect.any(String),
      );
    });

    it('should use custom timestamp when provided', async () => {
      prisma.telemetry.create.mockResolvedValue({ id: 'tel_001' });
      const customTime = new Date('2024-01-15T10:00:00Z');

      await service.ingestFromMqtt('device_001', 'org_001', { temp: 25 }, customTime);

      expect(prisma.telemetry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timestamp: customTime,
          }),
        }),
      );
    });
  });

  describe('query', () => {
    it('should return paginated telemetry with time range', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      const mockData = [
        { id: 'tel_001', metrics: { temp: 72 }, timestamp: new Date() },
        { id: 'tel_002', metrics: { temp: 73 }, timestamp: new Date() },
      ];

      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.findMany.mockResolvedValue(mockData);
      prisma.telemetry.count.mockResolvedValue(2);

      const result = await service.query('org_001', 'device_001', {
        page: '1',
        limit: '50',
      });

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.timeRange).toBeDefined();
    });

    it('should throw NotFoundException for device not in org', async () => {
      prisma.device.findFirst.mockResolvedValue(null);

      await expect(
        service.query('org_001', 'nonexistent', { page: '1', limit: '10' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use default pagination when not specified', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.findMany.mockResolvedValue([]);
      prisma.telemetry.count.mockResolvedValue(0);

      await service.query('org_001', 'device_001', {});

      expect(prisma.telemetry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
    });

    it('should cap limit at 1000', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.findMany.mockResolvedValue([]);
      prisma.telemetry.count.mockResolvedValue(0);

      await service.query('org_001', 'device_001', { limit: '5000' });

      expect(prisma.telemetry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });

    it('should use custom time range when provided', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.findMany.mockResolvedValue([]);
      prisma.telemetry.count.mockResolvedValue(0);

      await service.query('org_001', 'device_001', {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
      });

      const where = prisma.telemetry.findMany.mock.calls[0][0].where;
      expect(where.timestamp.gte).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(where.timestamp.lte).toEqual(new Date('2024-01-31T23:59:59Z'));
    });

    it('should compute aggregation when interval is specified', async () => {
      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);
      prisma.telemetry.findMany
        .mockResolvedValueOnce([]) // first call for paginated data
        .mockResolvedValueOnce([  // second call for aggregation
          { timestamp: new Date('2024-01-15T10:00:00Z'), metrics: { temp: 70 } },
          { timestamp: new Date('2024-01-15T10:30:00Z'), metrics: { temp: 75 } },
        ]);
      prisma.telemetry.count.mockResolvedValue(0);

      const result = await service.query('org_001', 'device_001', {
        interval: '1h',
      });

      expect(result.aggregated).toBeDefined();
      expect(result.aggregated!.interval).toBe('1h');
    });
  });

  describe('getLatest', () => {
    it('should check Redis first then DB', async () => {
      // Redis miss
      redisService.get.mockResolvedValue(null);

      const device = { id: 'device_001', name: 'Sensor' };
      prisma.device.findFirst.mockResolvedValue(device);

      const latestRecord = {
        id: 'tel_latest',
        deviceId: 'device_001',
        metrics: { temp: 72 },
        timestamp: new Date(),
      };
      prisma.telemetry.findFirst.mockResolvedValue(latestRecord);

      const result = await service.getLatest('org_001', 'device_001');

      expect(result.deviceId).toBe('device_001');
      expect(result.telemetry).toEqual(latestRecord);
      expect(redisService.get).toHaveBeenCalledWith('telemetry:latest:device_001');
      expect(prisma.device.findFirst).toHaveBeenCalled();
    });

    it('should return cached data from Redis', async () => {
      const cachedData = JSON.stringify({
        deviceId: 'device_001',
        metrics: { temp: 72.5 },
        timestamp: new Date().toISOString(),
      });
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getLatest('org_001', 'device_001');

      expect(result.deviceId).toBe('device_001');
      expect(result.metrics.temp).toBe(72.5);
      // Should NOT hit the DB since Redis had the data
      expect(prisma.device.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for device not in org', async () => {
      redisService.get.mockResolvedValue(null);
      prisma.device.findFirst.mockResolvedValue(null);

      await expect(
        service.getLatest('org_001', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return null telemetry when no records exist', async () => {
      redisService.get.mockResolvedValue(null);
      prisma.device.findFirst.mockResolvedValue({ id: 'device_001' });
      prisma.telemetry.findFirst.mockResolvedValue(null);

      const result = await service.getLatest('org_001', 'device_001');

      expect(result).toEqual({ deviceId: 'device_001', telemetry: null });
    });
  });
});
