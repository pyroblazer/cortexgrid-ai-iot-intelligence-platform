import { Test, TestingModule } from '@nestjs/testing';
import { UsageService } from '../usage.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsageService', () => {
  let service: UsageService;
  let redis: any;
  let prisma: any;

  const mockRedis = {
    incrby: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
  };

  const mockPrisma = {
    usageRecord: {
      upsert: jest.fn().mockResolvedValue({ id: 'usage_001' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: RedisService, useValue: mockRedis },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
    redis = module.get(RedisService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('increment', () => {
    it('should call redis.incrby with correct key', async () => {
      await service.increment('org_001', 'telemetryCount', 1);

      expect(redis.incrby).toHaveBeenCalledWith('usage:org_001:telemetryCount', 1);
    });

    it('should use default amount of 1', async () => {
      await service.increment('org_001', 'aiQueries');

      expect(redis.incrby).toHaveBeenCalledWith('usage:org_001:aiQueries', 1);
    });

    it('should support custom amounts', async () => {
      await service.increment('org_001', 'apiCalls', 5);

      expect(redis.incrby).toHaveBeenCalledWith('usage:org_001:apiCalls', 5);
    });

    it('should not throw on redis error', async () => {
      redis.incrby.mockRejectedValueOnce(new Error('Redis down'));

      await expect(service.increment('org_001', 'telemetryCount')).resolves.toBeUndefined();
    });
  });

  describe('get', () => {
    it('should return parsed value from redis', async () => {
      redis.get.mockResolvedValueOnce('42');

      const result = await service.get('org_001', 'telemetryCount');

      expect(result).toBe(42);
      expect(redis.get).toHaveBeenCalledWith('usage:org_001:telemetryCount');
    });

    it('should return 0 when key does not exist', async () => {
      redis.get.mockResolvedValueOnce(null);

      const result = await service.get('org_001', 'telemetryCount');

      expect(result).toBe(0);
    });
  });

  describe('flushToDb', () => {
    it('should upsert usage record to database', async () => {
      redis.get
        .mockResolvedValueOnce('100') // telemetryCount
        .mockResolvedValueOnce('50')  // aiQueries
        .mockResolvedValueOnce('200'); // apiCalls

      await service.flushToDb('org_001');

      expect(prisma.usageRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            organizationId: 'org_001',
            telemetryCount: 100,
            aiQueries: 50,
            apiCalls: 200,
          }),
          update: expect.objectContaining({
            telemetryCount: 100,
            aiQueries: 50,
            apiCalls: 200,
          }),
        }),
      );
    });

    it('should skip upsert when all values are 0', async () => {
      redis.get
        .mockResolvedValueOnce('0')
        .mockResolvedValueOnce('0')
        .mockResolvedValueOnce('0');

      await service.flushToDb('org_001');

      expect(prisma.usageRecord.upsert).not.toHaveBeenCalled();
    });
  });
});
