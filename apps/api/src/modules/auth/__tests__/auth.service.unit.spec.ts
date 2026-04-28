import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('$2b$12$hashedpassword')),
  compare: jest.fn(() => Promise.resolve(true)),
}));

import * as bcrypt from 'bcrypt';
const mockedHash = bcrypt.hash as unknown as jest.Mock;
const mockedCompare = bcrypt.compare as unknown as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let redis: any;
  let jwt: any;

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
        organization: { id: 'org_001', name: 'Test Org', slug: 'test-org', plan: 'FREE' },
      },
    ],
    ownedOrgs: [],
    notifications: [],
    alerts: [],
    invitations: [],
  };

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
      updateMany: jest.fn(),
    },
    notification: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  mockPrisma.$transaction.mockImplementation(
    (cb: (tx: any) => Promise<any>) => cb(mockPrisma),
  );

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn(),
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
    jest.clearAllMocks();

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
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
    jwt = module.get(JwtService);
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
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('refresh_token:'),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should throw BadRequestException if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if org slug already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org_existing' });

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
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: mockUser.id } }),
      );
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

    it('should throw UnauthorizedException if user is deactivated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if no active membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        memberships: [],
      });
      mockedCompare.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens for valid refresh token', async () => {
      jwt.verify.mockReturnValue({ sub: 'user_001', email: 'test@cortexgrid.io', organizationId: 'org_001' });
      mockRedis.get.mockResolvedValue('valid.refresh.token');
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        memberships: [{ organizationId: 'org_001', isActive: true }],
      });

      const result = await service.refreshTokens('valid.refresh.token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for mismatched token', async () => {
      jwt.verify.mockReturnValue({ sub: 'user_001', email: 'test@cortexgrid.io', organizationId: 'org_001' });
      mockRedis.get.mockResolvedValue('different.token');

      await expect(service.refreshTokens('wrong.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired/invalid JWT', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshTokens('expired.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jwt.verify.mockReturnValue({ sub: 'user_001', email: 'test@cortexgrid.io', organizationId: 'org_001' });
      mockRedis.get.mockResolvedValue('valid.refresh.token');
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('valid.refresh.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is deactivated', async () => {
      jwt.verify.mockReturnValue({ sub: 'user_001', email: 'test@cortexgrid.io', organizationId: 'org_001' });
      mockRedis.get.mockResolvedValue('valid.refresh.token');
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false, memberships: [] });

      await expect(service.refreshTokens('valid.refresh.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should use payload organizationId when no active membership', async () => {
      jwt.verify.mockReturnValue({ sub: 'user_001', email: 'test@cortexgrid.io', organizationId: 'org_from_payload' });
      mockRedis.get.mockResolvedValue('valid.refresh.token');
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        memberships: [],
      });

      const result = await service.refreshTokens('valid.refresh.token');

      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      const result = await service.logout('user_001');

      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user_001');
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user_001');

      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.memberships).toBeDefined();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateProfile', () => {
    it('should update firstName and lastName', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        id: 'user_001',
        email: 'test@cortexgrid.io',
        firstName: 'Updated',
        lastName: 'Name',
        avatarUrl: null,
      });

      const result = await service.updateProfile('user_001', {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(result.firstName).toBe('Updated');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_001' },
          data: expect.objectContaining({ firstName: 'Updated', lastName: 'Name' }),
        }),
      );
    });

    it('should update avatarUrl', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        id: 'user_001',
        email: 'test@cortexgrid.io',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.png',
      });

      const result = await service.updateProfile('user_001', {
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(result.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile('nonexistent', { firstName: 'X' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password and revoke refresh token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);

      const result = await service.changePassword('user_001', 'oldPass', 'newPass123!');

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user_001');
      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(false);

      await expect(
        service.changePassword('user_001', 'wrongPass', 'newPass123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'old', 'new'),
      ).rejects.toThrow(UnauthorizedException);
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

    it('should return null for deactivated user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_001',
        email: 'test@cortexgrid.io',
        firstName: 'Test',
        lastName: 'User',
        isActive: false,
      });

      const result = await service.validateUser('user_001');

      expect(result).toBeNull();
    });
  });

  describe('exportUserData', () => {
    it('should return user data without password hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user_001');

      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.memberships).toBeDefined();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteUserAccount', () => {
    it('should soft-delete user with no active owned orgs', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        ownedOrgs: [{ id: 'org_001', isActive: false }],
      });

      const result = await service.deleteUserAccount('user_001');

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user_001' } });
      expect(mockPrisma.membership.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_001' },
        data: { isActive: false },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user_001');
      expect(result.message).toBe('Account deleted successfully');
    });

    it('should throw BadRequestException if user owns active organizations', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        ownedOrgs: [{ id: 'org_001', isActive: true }],
      });

      await expect(service.deleteUserAccount('user_001')).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUserAccount('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
