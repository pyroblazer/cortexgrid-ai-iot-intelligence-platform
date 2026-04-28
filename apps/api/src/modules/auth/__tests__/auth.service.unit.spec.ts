import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

// Mock bcrypt to avoid slow real hashing in tests
jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('$2b$12$hashedpassword')),
  compare: jest.fn(() => Promise.resolve(true)),
}));

import * as bcrypt from 'bcrypt';
const mockedHash = bcrypt.hash as unknown as jest.Mock;
const mockedCompare = bcrypt.compare as unknown as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  const mockUser = {
    id: 'user_001',
    email: 'test@cortexgrid.io',
    passwordHash: '$2b$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    emailVerified: true,
    isActive: true,
    memberships: [
      {
        organizationId: 'org_001',
        role: 'OWNER',
        isActive: true,
        organization: { id: 'org_001', name: 'Test Org', slug: 'test-org' },
      },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    membership: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  mockPrisma.$transaction.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cb: (tx: any) => Promise<any>) => cb(mockPrisma),
  );

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRY: '15m',
        JWT_REFRESH_EXPIRY: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@cortexgrid.io',
      password: 'SecureP@ss123',
      firstName: 'New',
      lastName: 'User',
      organizationName: 'New Org',
    };

    it('should register a new user and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user_002',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org_002',
        name: registerDto.organizationName,
        slug: 'new-org',
      });
      mockPrisma.membership.create.mockResolvedValue({ id: 'mem_001' });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.organization.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@cortexgrid.io',
      password: 'password123',
    };

    it('should return tokens for valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(false);

      await expect(service.login({ ...loginDto, password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'noone@cortexgrid.io', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user when found and active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_001',
        email: 'test@cortexgrid.io',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      });

      const result = await service.validateUser('user_001');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent');

      expect(result).toBeNull();
    });
  });
});
