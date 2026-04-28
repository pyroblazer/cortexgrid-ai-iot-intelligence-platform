import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '../health.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: any;
  let redisService: any;
  let configService: any;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  const mockRedisService = {
    ping: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return ok status when DB and Redis healthy', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]); // SELECT 1
      redisService.ping.mockResolvedValue('PONG');
      prisma.$queryRaw.mockResolvedValueOnce([{ count: 42 }]); // audit log count

      const result = await service.check();

      expect(result.status).toBe('ok');
      expect(result.services.database.status).toBe('up');
      expect(result.services.database.latencyMs).toBeDefined();
      expect(result.services.redis.status).toBe('up');
      expect(result.services.redis.latencyMs).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.compliance).toBeDefined();
      expect(result.compliance.auditLogs24h).toBe(42);
      expect(result.compliance.helmetEnabled).toBe(true);
      expect(result.compliance.rateLimitingEnabled).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded when DB fails', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      redisService.ping.mockResolvedValue('PONG');
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.services.database.status).toBe('down');
      expect(result.services.database.details).toBe('Connection refused');
      expect(result.services.redis.status).toBe('up');
    });

    it('should return degraded when Redis fails', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      redisService.ping.mockRejectedValue(new Error('Redis unavailable'));
      prisma.$queryRaw.mockResolvedValueOnce([{ count: 0 }]);

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.services.redis.status).toBe('down');
      expect(result.services.redis.details).toBe('Redis unavailable');
    });

    it('should return degraded when both DB and Redis fail', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      redisService.ping.mockRejectedValue(new Error('Redis down'));
      prisma.$queryRaw.mockRejectedValueOnce(new Error('DB down'));

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.services.database.status).toBe('down');
      expect(result.services.redis.status).toBe('down');
    });

    it('should include compliance info', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      redisService.ping.mockResolvedValue('PONG');
      prisma.$queryRaw.mockResolvedValueOnce([{ count: 100 }]);

      const result = await service.check();

      expect(result.compliance).toBeDefined();
      expect(result.compliance.auditLogs24h).toBe(100);
      expect(result.compliance.corsOrigin).toBeDefined();
      expect(result.compliance.helmetEnabled).toBe(true);
      expect(result.compliance.rateLimitingEnabled).toBe(true);
    });

    it('should handle audit log count query failure gracefully', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      redisService.ping.mockResolvedValue('PONG');
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Table not found'));

      const result = await service.check();

      expect(result.compliance.auditLogs24h).toBe(0);
    });

    it('should include version from package', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      redisService.ping.mockResolvedValue('PONG');

      const result = await service.check();

      expect(result.version).toBeDefined();
    });

    it('should include uptime in seconds', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      redisService.ping.mockResolvedValue('PONG');

      const result = await service.check();

      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      redisService.ping.mockResolvedValue('PONG');

      const result = await service.check();

      expect(result.timestamp).toBeDefined();
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should use CORS_ORIGIN from config', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      redisService.ping.mockResolvedValue('PONG');
      configService.get.mockImplementation((key: string, defaultValue: string) => {
        if (key === 'CORS_ORIGIN') return 'https://app.example.com';
        return defaultValue;
      });

      const result = await service.check();

      expect(result.compliance.corsOrigin).toBe('https://app.example.com');
    });

    it('should handle non-Error DB failure', async () => {
      prisma.$queryRaw.mockRejectedValueOnce('string error');
      redisService.ping.mockResolvedValue('PONG');
      prisma.$queryRaw.mockRejectedValueOnce('string error');

      const result = await service.check();

      expect(result.services.database.details).toBe('Unknown error');
    });

    it('should handle non-Error Redis failure', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      redisService.ping.mockRejectedValue('string error');
      prisma.$queryRaw.mockResolvedValueOnce([{ count: 0 }]);

      const result = await service.check();

      expect(result.services.redis.details).toBe('Unknown error');
    });
  });
});
