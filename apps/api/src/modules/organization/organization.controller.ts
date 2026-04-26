import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MembershipRole } from '@prisma/client';

@ApiTags('Organizations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current user organization details' })
  @ApiResponse({ status: 200, description: 'Organization details retrieved' })
  async getCurrentOrganization(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationService.findOne(organizationId);
  }

  @Patch('current')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'Update current organization' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  async updateCurrentOrganization(
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(organizationId, updateDto);
  }

  @Get('current/members')
  @ApiOperation({ summary: 'List organization members' })
  @ApiResponse({ status: 200, description: 'Members list retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMembers(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.organizationService.getMembers(
      organizationId,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }

  @Post('current/invite')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'Invite a new member to the organization' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async inviteMember(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() inviteDto: InviteMemberDto,
  ) {
    return this.organizationService.inviteMember(
      organizationId,
      userId,
      inviteDto,
    );
  }

  @Patch('current/members/:memberId/role')
  @Roles(MembershipRole.OWNER)
  @ApiOperation({ summary: 'Update a member role' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  @ApiParam({ name: 'memberId', description: 'Membership ID' })
  async updateMemberRole(
    @CurrentUser('organizationId') organizationId: string,
    @Param('memberId') membershipId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
  ) {
    return this.organizationService.updateMemberRole(
      organizationId,
      membershipId,
      updateRoleDto,
    );
  }

  @Delete('current/members/:memberId')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiParam({ name: 'memberId', description: 'Membership ID' })
  async removeMember(
    @CurrentUser('organizationId') organizationId: string,
    @Param('memberId') membershipId: string,
  ) {
    return this.organizationService.removeMember(organizationId, membershipId);
  }

  @Get('current/invitations')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'List pending invitations' })
  @ApiResponse({ status: 200, description: 'Invitations list retrieved' })
  async getInvitations(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.organizationService.getInvitations(organizationId);
  }

  @Delete('current/invitations/:invitationId')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ApiOperation({ summary: 'Cancel an invitation' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  async cancelInvitation(
    @CurrentUser('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.organizationService.cancelInvitation(
      organizationId,
      invitationId,
    );
  }

  @Get('current/usage')
  @ApiOperation({ summary: 'Get organization usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage stats retrieved' })
  async getUsageStats(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.organizationService.getUsageStats(organizationId);
  }
}
