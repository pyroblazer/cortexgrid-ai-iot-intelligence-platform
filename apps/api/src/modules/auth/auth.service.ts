/**
 * @file auth.service.ts
 * @description Core authentication service handling user registration, login,
 * JWT token management, and token refresh flows.
 *
 * ELI5: This file is the "security desk" of the API. It handles:
 *   - Registering new users (creating their account + first organization)
 *   - Logging users in (checking their password and giving them a "visitor badge" / JWT)
 *   - Refreshing expired access tokens (getting a new badge without logging in again)
 *   - Logging users out (taking away their badge)
 *
 * KEY CONCEPTS:
 *   - JWT (JSON Web Token): A cryptographically signed "badge" that proves who you are.
 *     It has an expiry time so even if stolen, it becomes useless after a while.
 *     We use TWO tokens: a short-lived access token (15 min) and a long-lived refresh token (7 days).
 *
 *   - bcrypt: A password hashing algorithm. We NEVER store raw passwords in the database.
 *     Instead, we scramble them with bcrypt so even if the database is leaked,
 *     attackers can't read the passwords. bcrypt also adds "salt" (random data) so
 *     identical passwords produce different hashes.
 *
 *   - Redis for token storage: We store refresh tokens in Redis (fast in-memory database)
 *     instead of PostgreSQL. This makes token validation lightning-fast and lets us
 *     instantly revoke tokens on logout (just delete from Redis).
 *
 * WHY this design? Security in depth. The short-lived access token limits damage if leaked.
 * The refresh token lets users stay logged in without re-entering passwords. Storing
 * refresh tokens in Redis gives us instant revocation capability.
 */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Register a brand new user and create their first organization.
   *
   * ELI5: When someone signs up, we need to do THREE things atomically
   * (all-or-nothing): create the user account, create their organization,
   * and link them together as the "OWNER". We wrap this in a database
   * transaction so if any step fails, nothing is partially saved.
   *
   * Business rules enforced:
   *   - Email must be unique (no duplicate accounts)
   *   - Organization slug must be unique (URL-friendly identifier)
   *   - New orgs start on the FREE plan with a 5-device limit
   */
  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, organizationName } =
      registerDto;

    // Prevent duplicate accounts - check if email is already registered.
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    // Hash the password with bcrypt using 12 salt rounds.
    // ELI5: 12 salt rounds means bcrypt runs its hashing algorithm 2^12 = 4096 times.
    // This makes it computationally expensive for attackers trying to crack passwords,
    // while still being fast enough for legitimate logins (~100ms).
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate a URL-friendly slug from the organization name.
    // Example: "Acme Corp" becomes "acme-corp-a3f2k"
    // The random suffix prevents collisions between organizations with similar names.
    const slug = this.generateSlug(organizationName);

    // Verify the generated slug isn't already taken by another organization.
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existingOrg) {
      throw new BadRequestException(
        'An organization with a similar name already exists',
      );
    }

    // Wrap all database writes in a transaction.
    // ELI5: A transaction is like a "package deal" - either ALL of these database
    // operations succeed together, or NONE of them happen. This prevents half-created
    // accounts if something goes wrong midway.
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 1: Create the user record
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          emailVerified: false, // User hasn't confirmed their email yet
          isActive: true,
        },
      });

      // Step 2: Create the organization. Every user gets their own org on signup.
      // Free plan defaults: 5 devices max, 30-day data retention, TRIALING status.
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          plan: 'FREE',
          subscriptionStatus: 'TRIALING',
          deviceLimit: 5,
          isActive: true,
          settings: {
            timezone: 'UTC',
            telemetryRetentionDays: 30,
            alertNotificationsEnabled: true,
          },
          ownerId: user.id,
        },
      });

      // Step 3: Create a membership linking the user to their org as OWNER.
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'OWNER',
          isActive: true,
        },
      });

      return { user, organization };
    });

    // Generate the initial JWT access + refresh token pair for the new user.
    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.organization.id,
    );

    // Store the refresh token in Redis so we can validate it later.
    // Redis is used here because it's fast and lets us revoke tokens instantly
    // (just delete the key) compared to checking a database every time.
    await this.storeRefreshToken(result.user.id, tokens.refreshToken);

    this.logger.log(`User registered: ${email}`);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      ...tokens,
    };
  }

  /**
   * Log in an existing user with email and password.
   *
   * ELI5: The user hands us their email and password. We look up the email
   * in our database, then use bcrypt to check if the password matches the
   * scrambled hash we stored. If it matches, we give them fresh JWT tokens.
   *
   * Security note: We always return "Invalid email or password" for both
   * wrong email AND wrong password. This prevents attackers from figuring
   * out which emails are registered (called "user enumeration").
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Look up the user by email, including their organization memberships
    // so we can determine which org to set as active.
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Deliberately vague error to prevent user enumeration attacks.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if the account has been deactivated by an admin.
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // bcrypt.compare safely checks the password against the stored hash.
    // It handles the salt internally and is timing-safe (prevents timing attacks).
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Find the user's primary (first active) organization membership.
    // This determines which org context their JWT will be scoped to.
    const primaryMembership = user.memberships.find((m) => m.isActive);
    if (!primaryMembership) {
      throw new UnauthorizedException('No active organization membership');
    }

    // Generate a fresh pair of JWT tokens scoped to the user's primary org.
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      primaryMembership.organizationId,
    );

    // Store the new refresh token in Redis, replacing any previous one.
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Record when the user last logged in (useful for admin dashboards).
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${email}`);

    return {
      ...tokens,
      // Return user info including ALL their org memberships so the frontend
      // can show an org switcher if they belong to multiple organizations.
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        memberships: user.memberships.map((m) => ({
          organizationId: m.organizationId,
          role: m.role,
          organization: {
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            plan: m.organization.plan,
          },
        })),
      },
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   *
   * ELI5: Access tokens expire quickly (15 min) for security. When they do,
   * the frontend sends the refresh token here to get a brand new pair.
   * Think of it like renewing your visitor badge at the front desk
   * without having to go through the whole sign-in process again.
   *
   * Security checks performed:
   *   1. JWT signature is valid (token wasn't tampered with)
   *   2. Refresh token exists in Redis (hasn't been revoked)
   *   3. User still exists and is active (hasn't been deleted/banned)
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Verify the JWT signature and decode the payload.
      // This uses a SEPARATE secret (JWT_REFRESH_SECRET) from access tokens,
      // so even if an access token secret is compromised, refresh tokens remain safe.
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const userId = payload.sub;

      // Check if this specific refresh token is stored in Redis.
      // This is our "revocation check" - if the user logged out,
      // we deleted the token from Redis, so it won't match.
      const storedToken = await this.redisService.get(
        `refresh_token:${userId}`,
      );
      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Double-check the user still exists and hasn't been deactivated
      // since the refresh token was issued.
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            where: { isActive: true },
            take: 1,
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or deactivated');
      }

      // Use the current active membership org, or fall back to the one
      // encoded in the original refresh token payload.
      const orgId =
        user.memberships[0]?.organizationId || payload.organizationId;

      // Issue a completely new token pair (token rotation).
      // The old refresh token is invalidated when we overwrite it in Redis.
      const tokens = await this.generateTokens(user.id, user.email, orgId);

      // Store the new refresh token, replacing the old one.
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      // Re-throw our own UnauthorizedExceptions as-is.
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Wrap any other errors (like JWT expiry) in a generic message.
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Log out a user by deleting their refresh token from Redis.
   *
   * ELI5: We take away their visitor badge. Even if someone stole the
   * refresh token, it won't work anymore because we deleted it from Redis.
   * Note: The access token stays valid until it naturally expires (15 min).
   * This is acceptable because access tokens are short-lived.
   */
  async logout(userId: string) {
    // Delete the refresh token from Redis, effectively revoking it.
    await this.redisService.del(`refresh_token:${userId}`);
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Get the full profile of the currently authenticated user.
   *
   * Returns user details along with all their organization memberships
   * and organizations they own. Used by the frontend to populate the
   * user menu, org switcher, and settings pages.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                logoUrl: true,
                deviceLimit: true,
                subscriptionStatus: true,
              },
            },
          },
        },
        ownedOrgs: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Strip the password hash before returning - NEVER send it to the client.
    const { passwordHash, ...result } = user;
    return result;
  }

  /**
   * Validate that a user exists and is active.
   *
   * Called by the JWT strategy to attach user info to the request object.
   * Returns null if the user is invalid (which causes the auth guard to reject).
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * Generate a pair of JWT tokens: access token + refresh token.
   *
   * ELI5: We create two "badges":
   *   - Access token: Short-lived (15 min), used for everyday API calls.
   *     If stolen, it only works for 15 minutes.
   *   - Refresh token: Long-lived (7 days), ONLY used to get new access tokens.
   *     Stored securely in Redis so we can revoke it at any time.
   *
   * Both tokens contain the user ID, email, and organization ID so we
   * know WHO is making the request and WHICH org they belong to.
   *
   * WHY two tokens? It's a security tradeoff. Short-lived access tokens
   * limit the damage if leaked. But we don't want users re-entering their
   * password every 15 minutes, so the refresh token lets them get new
   * access tokens seamlessly.
   */
  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string,
  ) {
    // Generate both tokens in parallel for efficiency.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,           // "sub" (subject) is the standard JWT claim for user ID
          email,
          organizationId,        // Scopes the token to a specific org (multi-tenancy)
        },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          organizationId,
        },
        {
          // Uses a DIFFERENT secret from access tokens for defense in depth.
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Store a refresh token in Redis with a 7-day TTL (time-to-live).
   *
   * The TTL matches JWT_REFRESH_EXPIRY so the Redis key auto-expires
   * around the same time the JWT becomes invalid. We store one token
   * per user (latest wins), which means only one active session per user.
   *
   * WHY Redis instead of the database? Speed and instant revocation.
   * Redis lookups take ~1ms vs ~10ms for PostgreSQL. And when a user
   * logs out, we simply delete the key - no need to update a row.
   */
  private async storeRefreshToken(userId: string, refreshToken: string) {
    // Store for 7 days (matching JWT_REFRESH_EXPIRY)
    await this.redisService.set(
      `refresh_token:${userId}`,
      refreshToken,
      7 * 24 * 60 * 60,  // 7 days in seconds
    );
  }

  /**
   * Generate a URL-friendly slug from an organization name.
   *
   * Example: "Acme Corp!" becomes "acme-corp-a3f2k"
   *
   * Steps:
   *   1. Lowercase and trim whitespace
   *   2. Remove special characters (keep letters, numbers, dashes)
   *   3. Replace spaces/underscores with dashes
   *   4. Remove leading/trailing dashes
   *   5. Append a random 5-character suffix to prevent collisions
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')       // Remove non-word chars except spaces/dashes
      .replace(/[\s_]+/g, '-')        // Replace spaces and underscores with dashes
      .replace(/^-+|-+$/g, '')        // Remove leading/trailing dashes
      .concat('-', Math.random().toString(36).substring(2, 7)); // Add random suffix
  }
}
