/**
 * @file organization.service.ts
 * @description Multi-tenant organization management: settings, memberships,
 * invitations, and usage statistics.
 *
 * ELI5: This file manages the "companies" or "teams" that use the platform.
 * Each organization is like a separate workspace with its own devices, users,
 * and settings. This service handles:
 *   - Viewing and updating organization details
 *   - Managing team members (listing, inviting, removing, changing roles)
 *   - Sending and managing invitations (with expiration and cancellation)
 *   - Tracking usage statistics (device count, member count, etc.)
 *
 * MULTI-TENANCY EXPLAINED:
 *   Think of a multi-tenant building. Each organization is a tenant with their
 *   own apartment (their devices, data, users). Tenants can't see into each
 *   other's apartments. Every query in this service filters by organizationId
 *   to ensure data isolation between tenants.
 *
 * RBAC (Role-Based Access Control):
 *   Each member has a role: OWNER, ADMIN, or MEMBER.
 *   - OWNER: Can do everything, can't be removed or have role changed
 *   - ADMIN: Can manage members and settings
 *   - MEMBER: Can view data and manage devices
 *   The RolesGuard enforces these checks at the controller level.
 *
 * INVITATION FLOW:
 *   1. Admin/Owner creates an invitation with email + role
 *   2. Invitation gets a unique UUID token and 7-day expiration
 *   3. The token is emailed to the invitee (email sending not implemented here)
 *   4. Invitee clicks the link and accepts, creating a membership
 *   5. Duplicate invitations are prevented (one pending invite per email per org)
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get an organization's details including owner info and counts.
   */
  async findOne(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            devices: true,
            memberships: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(
    organizationId: string,
    updateDto: UpdateOrganizationDto,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.logoUrl !== undefined && { logoUrl: updateDto.logoUrl }),
        ...(updateDto.settings && {
          settings: {
            ...(organization.settings as Record<string, any>),
            ...updateDto.settings,
          },
        }),
      },
    });

    // Invalidate the organization cache so stale data isn't served.
    await this.redisService.del(`org:${organizationId}`);

    this.logger.log(`Organization updated: ${organizationId}`);
    return updated;
  }

  async getMembers(organizationId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      this.prisma.membership.findMany({
        where: { organizationId, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              lastLoginAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.membership.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      data: members,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Invite a new member to the organization via email.
   *
   * ELI5: An admin types in someone's email and picks a role (ADMIN/MEMBER).
   * We create an invitation record with a unique token that expires in 7 days.
   * The token is used in the invitation link sent to the user's email.
   *
   * Guards against:
   *   - Inviting someone who's already a member
   *   - Creating duplicate pending invitations
   */
  async inviteMember(
    organizationId: string,
    invitedBy: string,
    inviteDto: InviteMemberDto,
  ) {
    const { email, role } = inviteDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if already a member
      const existingMembership =
        await this.prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId,
            },
          },
        });

      if (existingMembership && existingMembership.isActive) {
        throw new BadRequestException('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email,
        organizationId,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('A pending invitation already exists for this email');
    }

    // Create the invitation with a UUID token for the invitation link.
    // The token is unique and unguessable, so only the email recipient can use it.
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        organizationId,
        role,
        token,
        invitedBy,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        organization: {
          select: { name: true, slug: true },
        },
      },
    });

    this.logger.log(
      `Invitation created: ${email} to organization ${organizationId}`,
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
    };
  }

  async updateMemberRole(
    organizationId: string,
    membershipId: string,
    updateRoleDto: UpdateMemberRoleDto,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw new NotFoundException('Membership not found in this organization');
    }

    // Protect the OWNER role - nobody can change the owner's role.
    // Ownership transfer would be a separate, more complex flow.
    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot change the owner role');
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: updateRoleDto.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(
      `Member role updated: ${membershipId} to ${updateRoleDto.role}`,
    );

    return updated;
  }

  async removeMember(organizationId: string, membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw new NotFoundException('Membership not found in this organization');
    }

    // The owner is the org creator and cannot be removed.
    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    // Soft-delete: set isActive=false instead of deleting the row.
    // This preserves the audit trail of who was ever a member.
    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { isActive: false },
    });

    this.logger.log(`Member removed: ${membershipId}`);
    return { message: 'Member removed successfully' };
  }

  async getInvitations(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvitation(organizationId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId, status: 'PENDING' },
    });

    if (!invitation) {
      throw new NotFoundException('Pending invitation not found');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'EXPIRED' },
    });

    return { message: 'Invitation cancelled' };
  }

  /**
   * Get usage statistics for an organization's dashboard.
   *
   * ELI5: Returns a snapshot of how much of the organization's plan
   * is being used: how many devices (vs. limit), how many members,
   * active alerts, and recent API usage metrics.
   * Used for the admin dashboard and billing page.
   */
  async getUsageStats(organizationId: string) {
    const [deviceCount, membershipCount, alertCount, recentUsage] =
      await Promise.all([
        this.prisma.device.count({
          where: { organizationId, isActive: true },
        }),
        this.prisma.membership.count({
          where: { organizationId, isActive: true },
        }),
        this.prisma.alert.count({
          where: { organizationId, status: 'ACTIVE' },
        }),
        this.prisma.usageRecord.findFirst({
          where: { organizationId },
          orderBy: { period: 'desc' },
        }),
      ]);

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { deviceLimit: true, plan: true },
    });

    return {
      devices: {
        count: deviceCount,
        limit: organization?.deviceLimit || 5,
        percentUsed: Math.round(
          (deviceCount / (organization?.deviceLimit || 5)) * 100,
        ),
      },
      members: membershipCount,
      activeAlerts: alertCount,
      recentUsage: recentUsage || {
        telemetryCount: 0,
        apiCalls: 0,
        aiQueries: 0,
        storageUsedMb: 0,
      },
      plan: organization?.plan || 'FREE',
    };
  }
}
