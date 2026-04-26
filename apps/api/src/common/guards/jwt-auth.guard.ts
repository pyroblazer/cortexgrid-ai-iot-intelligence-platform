/**
 * @file jwt-auth.guard.ts
 * @description Global JWT authentication guard that protects all endpoints by default.
 *
 * ELI5: Think of this as a security checkpoint at the entrance of the API.
 * Every request must pass through here. The guard checks for a valid JWT token
 * in the Authorization header. If the token is valid, the request proceeds.
 * If not, the user gets a 401 Unauthorized error.
 *
 * HOW IT WORKS:
 *   1. The guard runs BEFORE any controller method executes
 *   2. It calls Passport's JWT strategy to verify the token
 *   3. If the token is valid, Passport attaches the user to the request
 *   4. If the endpoint has @Public() decorator, the guard skips authentication
 *   5. If authentication fails, handleRequest() throws a clear error
 *
 * THE AUTH GUARD CHAIN:
 *   Request arrives -> ThrottlerGuard (rate limiting) -> JwtAuthGuard (auth check)
 *   -> RolesGuard (permission check) -> Controller method executes
 *
 * WHY @Public() instead of @UseGuards()?
 *   We apply JwtAuthGuard GLOBALLY (every endpoint requires auth by default).
 *   Endpoints that don't need auth (like login and register) use @Public()
 *   to opt OUT of authentication. This is more secure because you can't
 *   accidentally forget to add auth to a new endpoint.
 */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determine whether the current request should be authenticated.
   *
   * Checks if the handler (method) or class (controller) has the @Public()
   * decorator. If so, skip authentication entirely. Otherwise, delegate to
   * Passport's JWT strategy (via super.canActivate) which verifies the token.
   */
  canActivate(context: ExecutionContext) {
    // Check if @Public() decorator is set on the method or controller class.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),   // Check method-level decorator
      context.getClass(),     // Check class-level decorator
    ]);

    // Public endpoints (login, register) skip authentication entirely.
    if (isPublic) {
      return true;
    }

    // For protected endpoints, delegate to Passport's JWT strategy.
    // Passport will extract the Bearer token, verify the signature,
    // decode the payload, and call our validate() method in jwt.strategy.ts.
    return super.canActivate(context);
  }

  /**
   * Custom error handling after Passport processes the token.
   *
   * Called by Passport after it attempts to authenticate the request.
   * - err: Any error thrown during authentication
   * - user: The authenticated user (null if auth failed)
   * - info: Additional info about why auth failed (e.g., token expired)
   *
   * We override this to throw a clear, consistent error message
   * instead of Passport's default cryptic messages.
   */
  handleRequest<TUser = any>(err: any, user: any, info: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
