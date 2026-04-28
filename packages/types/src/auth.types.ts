// ============================================================================
// CortexGrid Auth Types
// ============================================================================

/**
 * Roles available within a CortexGrid organization.
 * Determines the level of access a member has to platform resources.
 */
export enum Role {
  /** Full control over the organization and all resources */
  OWNER = "OWNER",
  /** Administrative access including member management */
  ADMIN = "ADMIN",
  /** Standard access to create and manage devices and data */
  MEMBER = "MEMBER",
  /** Read-only access to dashboards and telemetry */
  VIEWER = "VIEWER",
}

/**
 * JWT token payload structure used across CortexGrid services.
 * Contains identity claims and multi-tenant organization context.
 */
export interface JwtPayload {
  /** Unique user identifier */
  sub: string;
  /** User email address */
  email: string;
  /** Display name of the user */
  name: string;
  /** Roles assigned to the user within the specified organization */
  roles: Role[];
  /** The organization context for this token */
  organizationId: string;
  /** Token issued-at timestamp (seconds since epoch) */
  iat: number;
  /** Token expiration timestamp (seconds since epoch) */
  exp: number;
  /** JWT token identifier for revocation tracking */
  jti: string;
  /** Token issuer (e.g. "cortexgrid") */
  iss: string;
  /** Intended audience for the token */
  aud: string;
}

/**
 * Data transfer object for user login requests.
 */
export interface LoginDto {
  /** User email address */
  email: string;
  /** User password */
  password: string;
  /** Optional organization ID to set as active context */
  organizationId?: string;
}

/**
 * Data transfer object for user registration requests.
 */
export interface RegisterDto {
  /** Desired display name */
  name: string;
  /** User email address (must be unique) */
  email: string;
  /** Password meeting minimum security requirements */
  password: string;
  /** Password confirmation must match password */
  confirmPassword: string;
  /** Optional organization name to create during registration */
  organizationName?: string;
}

/**
 * Response returned after successful authentication containing
 * the access and refresh token pair.
 */
export interface TokenResponse {
  /** JWT access token for API authorization */
  accessToken: string;
  /** Refresh token used to obtain new access tokens */
  refreshToken: string;
  /** Access token expiration time as ISO 8601 string */
  expiresIn: string;
  /** The decoded user information from the token */
  user: AuthUser;
}

/**
 * Minimal user information returned in auth responses.
 */
export interface AuthUser {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email: string;
  /** Display name */
  name: string;
  /** URL to user avatar image */
  avatarUrl?: string;
  /** Whether the user has verified their email */
  emailVerified: boolean;
  /** Timestamp of account creation */
  createdAt: string;
}

/**
 * Request body for refreshing an expired access token.
 */
export interface RefreshTokenDto {
  /** The refresh token issued during login */
  refreshToken: string;
}

/**
 * Request body for initiating a password reset flow.
 */
export interface ForgotPasswordDto {
  /** Email address of the account to reset */
  email: string;
}

/**
 * Request body for completing a password reset.
 */
export interface ResetPasswordDto {
  /** The password reset token received via email */
  token: string;
  /** New password meeting minimum security requirements */
  newPassword: string;
  /** Confirmation of the new password */
  confirmPassword: string;
}

/**
 * Request body for changing password while authenticated.
 */
export interface ChangePasswordDto {
  /** The user's current password */
  currentPassword: string;
  /** The desired new password */
  newPassword: string;
  /** Confirmation of the new password */
  confirmPassword: string;
}

/**
 * All auth-related types are exported directly from this module.
 * Use `import { Role, JwtPayload, ... } from "@cortexgrid/types"` to access them.
 */
