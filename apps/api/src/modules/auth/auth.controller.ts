/**
 * @file auth.controller.ts
 * @description HTTP endpoints (routes) for user authentication.
 *
 * ELI5: This file defines the "doors" into the auth system. Each method
 * handles one URL pattern (like POST /auth/login) and decides what to do
 * with the incoming request. The controller is thin - it just receives the
 * request, hands it to AuthService for the real work, and returns the result.
 *
 * Endpoints provided:
 *   - POST /auth/register  - Create a new account (public, no auth needed)
 *   - POST /auth/login     - Log in with email/password (public)
 *   - POST /auth/refresh   - Get new tokens using a refresh token (public)
 *   - POST /auth/logout    - Revoke refresh token (requires valid JWT)
 *   - GET  /auth/me        - Get current user's profile (requires valid JWT)
 *
 * The @Public() decorator marks endpoints that DON'T need a JWT.
 * All other endpoints require a valid JWT (enforced by JwtAuthGuard).
 */
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';

// Groups all auth endpoints under the "Auth" tag in Swagger documentation.
@ApiTags('Auth')
// Base route: all endpoints in this controller start with /auth
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Create a new user account + organization.
   *
   * @Public() means this endpoint does NOT require a JWT.
   * Anyone on the internet can call this (they're creating a new account).
   */
  @Public()
  @Post('register')
  @AuditAction('user.register', 'User')
  @ApiOperation({ summary: 'Register a new user and organization' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
              },
            },
            organization: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input or email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/login
   * Authenticate with email and password, receive JWT tokens.
   *
   * @Public() because the user doesn't have a token yet - they're trying to get one.
   * @HttpCode(HttpStatus.OK) forces a 200 status. By default, POST returns 201,
   * but login is idempotent (doesn't create anything new), so 200 is more appropriate.
   */
  @Public()
  @Post('login')
  @AuditAction('user.login', 'User')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /auth/refresh
   * Exchange a valid refresh token for a new access + refresh token pair.
   *
   * @Public() because the access token has expired - the user only has their
   * refresh token to prove who they are.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  /**
   * POST /auth/logout
   * Invalidate the user's refresh token so it can't be used again.
   *
   * REQUIRES authentication (no @Public()). The @CurrentUser decorator
   * extracts the user ID from the verified JWT payload automatically.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)   // Enforce JWT authentication
  @ApiBearerAuth('JWT-auth') // Tell Swagger this needs a Bearer token
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  /**
   * GET /auth/me
   * Fetch the authenticated user's full profile including org memberships.
   *
   * REQUIRES authentication. The frontend calls this on app startup
   * to load user data and populate the UI (avatar, name, org switcher).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            memberships: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('me')
  @AuditAction('user.updateProfile', 'User')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, updateDto);
  }

  @Patch('me/password')
  @AuditAction('user.changePassword', 'User')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Get('me/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Export all user data (GDPR Article 20)' })
  @ApiResponse({ status: 200, description: 'User data exported' })
  async exportData(@CurrentUser('id') userId: string) {
    return this.authService.exportUserData(userId);
  }

  @Delete('me')
  @AuditAction('user.delete', 'User')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user account (GDPR Article 17)' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.authService.deleteUserAccount(userId);
  }
}
