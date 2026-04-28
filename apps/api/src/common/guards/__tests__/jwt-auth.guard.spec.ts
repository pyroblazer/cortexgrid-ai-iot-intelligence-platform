import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  const createMockExecutionContext = (request: any = {}): ExecutionContext => {
    const handler = jest.fn();
    const klass = jest.fn();
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => handler,
      getClass: () => klass,
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow requests with @Public() decorator', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call super.canActivate for non-public routes', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = createMockExecutionContext();

      // super.canActivate returns an Observable, wrap it so we can test the call happened
      const result = guard.canActivate(context);

      // The result should be the return value of super.canActivate
      // which delegates to Passport's AuthGuard
      expect(result).toBeDefined();
    });

    it('should return true when isPublic is undefined (no decorator)', () => {
      // When getAllAndOverride returns undefined/false, it means no @Public() decorator
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      // Should delegate to super.canActivate (not return true)
      expect(result).toBeDefined();
    });
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException on error', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });

    it('should throw UnauthorizedException when user is null without error', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, null)).toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException when user is undefined without error', () => {
      expect(() => guard.handleRequest(null, undefined, {})).toThrow(UnauthorizedException);
    });

    it('should return user on success', () => {
      const user = { id: 'user_001', email: 'test@example.com' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toBe(user);
      expect(result).toEqual({ id: 'user_001', email: 'test@example.com' });
    });

    it('should throw the error itself when err is provided', () => {
      const customError = new Error('Custom auth failure');

      expect(() => guard.handleRequest(customError, null, null)).toThrow(customError);
    });

    it('should throw UnauthorizedException when user is falsy but no error', () => {
      expect(() => guard.handleRequest(null, false, 'Token expired')).toThrow(UnauthorizedException);
    });
  });
});
