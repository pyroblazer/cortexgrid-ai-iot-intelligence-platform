// ============================================================================
// CortexGrid Organization Types
// ============================================================================

import { Role } from "./auth.types";

/**
 * Role assignment within an organization's membership.
 * Extends the base Role enum for membership-specific contexts.
 */
export enum MembershipRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

/**
 * Status of an organization membership invitation.
 */
export enum InvitationStatus {
  /** Invitation has been sent but not yet responded to */
  PENDING = "PENDING",
  /** Invitee has accepted the invitation */
  ACCEPTED = "ACCEPTED",
  /** Invitee has declined the invitation */
  DECLINED = "DECLINED",
  /** Invitation has expired without response */
  EXPIRED = "EXPIRED",
  /** Invitation was revoked by an admin */
  REVOKED = "REVOKED",
}

/**
 * Data transfer object for creating a new organization.
 */
export interface CreateOrganizationDto {
  /** Organization display name */
  name: string;
  /** Optional slug for URL-friendly identification */
  slug?: string;
  /** Optional description of the organization */
  description?: string;
  /** Optional URL to organization logo */
  logoUrl?: string;
  /** Key-value pairs for custom organization metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Data transfer object for updating an existing organization.
 */
export interface UpdateOrganizationDto {
  /** Updated organization name */
  name?: string;
  /** Updated slug */
  slug?: string;
  /** Updated description */
  description?: string;
  /** Updated logo URL */
  logoUrl?: string;
  /** Updated custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Full organization response with all details.
 */
export interface OrganizationResponse {
  /** Unique organization identifier */
  id: string;
  /** Display name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Description */
  description?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** ID of the user who owns this organization */
  ownerId: string;
  /** Current subscription plan */
  plan: string;
  /** Number of members in the organization */
  memberCount: number;
  /** Number of devices registered */
  deviceCount: number;
  /** Timestamp of creation */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Represents a user's membership within an organization.
 */
export interface OrganizationMember {
  /** Unique membership identifier */
  id: string;
  /** The user's unique identifier */
  userId: string;
  /** The organization this membership belongs to */
  organizationId: string;
  /** The user's display name */
  userName: string;
  /** The user's email address */
  userEmail: string;
  /** The user's avatar URL */
  avatarUrl?: string;
  /** The role assigned to this member */
  role: MembershipRole;
  /** Whether the member has accepted the invitation */
  isAccepted: boolean;
  /** Timestamp when the membership was created */
  joinedAt: string;
  /** Timestamp of last membership update */
  updatedAt: string;
}

/**
 * An invitation to join an organization.
 */
export interface OrganizationInvitation {
  /** Unique invitation identifier */
  id: string;
  /** The organization the invitee is being invited to */
  organizationId: string;
  /** Email address of the invitee */
  email: string;
  /** The role that will be assigned upon acceptance */
  role: MembershipRole;
  /** Current status of the invitation */
  status: InvitationStatus;
  /** The user who created the invitation */
  invitedBy: string;
  /** Timestamp when the invitation was created */
  createdAt: string;
  /** Timestamp when the invitation expires */
  expiresAt: string;
  /** Timestamp when the invitation was last updated */
  updatedAt?: string;
}

/**
 * Data transfer object for inviting a new member to an organization.
 */
export interface InviteMemberDto {
  /** Email address of the person to invite */
  email: string;
  /** Role to assign upon acceptance */
  role: MembershipRole;
}

/**
 * Data transfer object for updating a member's role.
 */
export interface UpdateMemberRoleDto {
  /** The new role to assign */
  role: MembershipRole;
}

/**
 * A team within an organization for grouping members and devices.
 */
export interface Team {
  /** Unique team identifier */
  id: string;
  /** Team display name */
  name: string;
  /** Team description */
  description?: string;
  /** The organization this team belongs to */
  organizationId: string;
  /** IDs of users who are members of this team */
  memberIds: string[];
  /** IDs of devices assigned to this team */
  deviceIds: string[];
  /** Timestamp of creation */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
}

/**
 * Data transfer object for creating a new team.
 */
export interface CreateTeamDto {
  /** Team display name */
  name: string;
  /** Team description */
  description?: string;
  /** Initial member user IDs */
  memberIds?: string[];
  /** Initial device IDs to assign */
  deviceIds?: string[];
}

/**
 * Data transfer object for updating a team.
 */
export interface UpdateTeamDto {
  /** Updated team name */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated member user IDs (replaces existing) */
  memberIds?: string[];
  /** Updated device IDs (replaces existing) */
  deviceIds?: string[];
}

/**
 * Namespace exporting all organization-related types.
 */
export namespace OrganizationTypes {
  export type {
    CreateOrganizationDto,
    UpdateOrganizationDto,
    OrganizationResponse,
    OrganizationMember,
    OrganizationInvitation,
    InviteMemberDto,
    UpdateMemberRoleDto,
    Team,
    CreateTeamDto,
    UpdateTeamDto,
  };
  export { MembershipRole, InvitationStatus };
}
