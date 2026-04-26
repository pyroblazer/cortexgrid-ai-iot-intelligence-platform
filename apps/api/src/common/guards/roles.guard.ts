/**
 * @file roles.guard.ts
 * @description Role-Based Access Control (RBAC) guard that enforces role requirements
 * on endpoints using the @Roles() decorator.
 *
 * ELI5: After the JWT guard confirms WHO you are (authentication), this guard
 * checks WHAT you're allowed to do (authorization). Think of it like different
 * key cards in a hotel: the OWNER card opens everything, the ADMIN card opens
 * most things, and the MEMBER card opens only common areas.
 *
 * HOW RBAC WORKS HERE:
 *   1. A controller method can be decorated with @Roles('OWNER', 'ADMIN')
 *   2. When a request hits that method, this guard runs
 *   3. It checks the user's role in the current organization
 *   4. If the role matches one of the required roles, the request proceeds
 *   5. If not, the user gets a 403 Forbidden error
 *
 * IMPORTANT: This guard relies on `request.user.membership` being set by
 * a previous guard/middleware. The JWT strategy must include the user's
 * membership info for this guard to work.
 *
 * GUARD EXECUTION ORDER:
 *   JwtAuthGuard (authenticates) -> RolesGuard (authorizes) -> Controller
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { MembershipRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Check if the authenticated user has one of the required roles.
   *
   * Returns true if access is allowed, throws ForbiddenException if not.
   * If no @Roles() decorator is present on the endpoint, access is allowed
   * to all authenticated users (any role).
   */
  canActivate(context: ExecutionContext): boolean {
    // Read the @Roles() decorator metadata from the handler or class.
    // e.g., @Roles('OWNER', 'ADMIN') would give us ['OWNER', 'ADMIN'].
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @Roles() decorator is present, the endpoint is accessible
    // to all authenticated users regardless of role.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // user is attached by JwtAuthGuard/Passport after successful authentication.
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // membership contains the user's role in the current organization,
    // set by the JWT strategy or a custom decorator.
    const membership = user.membership;
    if (!membership) {
      throw new ForbiddenException('No organization membership found');
    }

    // Check if the user's role is in the list of required roles.
    const hasRole = requiredRoles.includes(membership.role);
    if (!hasRole) {
      // The error message includes the required roles so the frontend
      // can display a helpful message like "This action requires OWNER or ADMIN role".
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
