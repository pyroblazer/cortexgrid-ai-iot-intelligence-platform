import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard';
import { ROLES_KEY } from '../../decorators/roles.decorator';
import { MembershipRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (request: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow when no @Roles() decorator is present (no metadata)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext({ user: { membership: { role: 'MEMBER' } } });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow when no @Roles() decorator returns empty array', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockExecutionContext({ user: { membership: { role: 'MEMBER' } } });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow when user has the required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([MembershipRole.OWNER]);
      const context = createMockExecutionContext({
        user: { membership: { role: MembershipRole.OWNER } },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow when user has ADMIN role and ADMIN is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([MembershipRole.ADMIN]);
      const context = createMockExecutionContext({
        user: { membership: { role: MembershipRole.ADMIN } },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks the required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([MembershipRole.OWNER]);
      const context = createMockExecutionContext({
        user: { membership: { role: MembershipRole.MEMBER } },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
    });

    it('should handle user with multiple roles including the required one', () => {
      // The required roles list includes ADMIN and OWNER
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        MembershipRole.OWNER,
        MembershipRole.ADMIN,
      ]);
      const context = createMockExecutionContext({
        user: { membership: { role: MembershipRole.ADMIN } },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user has MEMBER role but OWNER is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([MembershipRole.OWNER]);
      const context = createMockExecutionContext({
        user: { membership: { role: MembershipRole.MEMBER } },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when membership is missing', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([MembershipRole.ADMIN]);
      const context = createMockExecutionContext({
        user: { id: 'user_001' },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('No organization membership found');
    });

    it('should throw ForbiddenException when user is null', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([MembershipRole.ADMIN]);
      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should include required roles in the error message', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([MembershipRole.OWNER, MembershipRole.ADMIN]);
      const context = createMockExecutionContext({
        user: { membership: { role: MembershipRole.MEMBER } },
      });

      try {
        guard.canActivate(context);
        fail('Expected ForbiddenException');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('OWNER');
        expect(error.message).toContain('ADMIN');
      }
    });
  });
});
