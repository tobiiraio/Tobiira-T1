import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { OrganizationMembershipGuard } from './guards/organization-membership.guard';
import { RequireMembershipRoles } from '../roles/decorators/require-membership-roles.decorator';
import { MembershipRolesGuard } from '../roles/guards/membership-roles.guard';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import type { TenantContext } from './decorators/current-tenant.decorator';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { ResolveJoinRequestDto } from './dto/resolve-join-request.dto';
import { MembershipsService } from './memberships.service';
import { EventPublisher } from '../../../rabbitmq/event-publisher.service';
import { CoreEvents } from '@tobiira/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { InternalApiKeyGuard } from '../../../common/guards/internal-api-key.guard';
import type { MembershipRole } from '../roles/membership-role';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller()
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  @ApiOperation({ summary: 'List members of an organization' })
  @ApiResponse({ status: 200, description: 'Member list' })
  @UseGuards(JwtAccessGuard, OrganizationMembershipGuard, MembershipRolesGuard)
  @RequireMembershipRoles('owner', 'operator')
  @Get('organizations/:organizationId/memberships')
  async listMembers(
    @CurrentTenant() tenant: TenantContext,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.membershipsService.listMembers({
      organizationId: tenant.organizationId,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }

  @ApiOperation({ summary: 'Invite a user to an organization' })
  @ApiResponse({ status: 201, description: 'Invite created and email sent' })
  @UseGuards(JwtAccessGuard, OrganizationMembershipGuard, MembershipRolesGuard)
  @RequireMembershipRoles('owner', 'operator')
  @Post('organizations/:organizationId/memberships/invite')
  async invite(
    @CurrentUser() user: CurrentUserType,
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: InviteMemberDto,
  ): Promise<{ ok: true; expiresAt: string }> {
    const invite = await this.membershipsService.createInvite({
      organizationId: tenant.organizationId,
      invitedEmail: dto.email,
      role: dto.role,
      staffRole: dto.staffRole ?? null,
      isManagingAgent: dto.isManagingAgent ?? false,
      createdByUserId: user.userId,
    });

    this.eventPublisher.emit(CoreEvents.MEMBERSHIP_INVITED, {
      email: dto.email,
      organizationId: tenant.organizationId,
      role: dto.role,
      token: invite.token,
      expiresAt: invite.expiresAt,
    });

    return { ok: true, expiresAt: invite.expiresAt };
  }

  @ApiOperation({ summary: "Update a member's role within an organization" })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @UseGuards(JwtAccessGuard, OrganizationMembershipGuard, MembershipRolesGuard)
  @RequireMembershipRoles('owner')
  @Patch('organizations/:organizationId/memberships/:userId/role')
  async updateMemberRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membershipsService.updateMemberRole({
      organizationId: tenant.organizationId,
      userId,
      role: dto.role,
    });
  }

  @ApiOperation({ summary: 'Remove a member from an organization' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({ status: 400, description: 'Cannot remove self or organization owner' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @UseGuards(JwtAccessGuard, OrganizationMembershipGuard, MembershipRolesGuard)
  @RequireMembershipRoles('owner', 'operator')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('organizations/:organizationId/memberships/:userId')
  async removeMember(
    @CurrentUser() user: CurrentUserType,
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.membershipsService.removeMember({
      organizationId: tenant.organizationId,
      userId,
      requestingUserId: user.userId,
    });
  }

  // Internal — called by verticals (Persta, Testa, etc.) to directly enroll a user as occupant.
  @ApiOperation({ summary: '[Internal] Directly enroll a user as a member — service-to-service only' })
  @ApiResponse({ status: 201, description: 'Membership created' })
  @UseGuards(InternalApiKeyGuard)
  @Post('organizations/:organizationId/memberships/internal')
  async createMembershipDirect(
    @Param('organizationId') organizationId: string,
    @Body() body: { userId: string; role: MembershipRole },
  ) {
    return this.membershipsService.createMembershipDirect({
      organizationId,
      userId: body.userId,
      role: body.role,
    });
  }

  // Any authenticated user can request to join an org
  @ApiOperation({ summary: 'Request to join an organization' })
  @ApiResponse({ status: 201, description: 'Join request submitted' })
  @ApiResponse({ status: 409, description: 'Already a member or request already pending' })
  @UseGuards(JwtAccessGuard)
  @Post('organizations/:organizationId/join-requests')
  async createJoinRequest(
    @CurrentUser() user: CurrentUserType,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateJoinRequestDto,
  ) {
    const [result, ctx] = await Promise.all([
      this.membershipsService.createJoinRequest({
        organizationId,
        userId: user.userId,
        userEmail: user.email,
        message: dto.message,
      }),
      this.membershipsService.resolveJoinRequestContext(organizationId),
    ]);
    this.eventPublisher.emit(CoreEvents.JOIN_REQUEST_RECEIVED, {
      requestId: result.id,
      organizationId,
      userEmail: user.email,
      ownerEmail: ctx.ownerEmail ?? '',
      organizationName: ctx.organizationName ?? organizationId,
      message: dto.message,
    });
    return result;
  }

  // Owner/operator lists pending join requests
  @ApiOperation({ summary: 'List pending join requests for an organization' })
  @ApiResponse({ status: 200, description: 'Join request list' })
  @UseGuards(JwtAccessGuard, OrganizationMembershipGuard, MembershipRolesGuard)
  @RequireMembershipRoles('owner', 'operator')
  @Get('organizations/:organizationId/join-requests')
  async listJoinRequests(
    @CurrentTenant() tenant: TenantContext,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.membershipsService.listJoinRequests({
      organizationId: tenant.organizationId,
      limit: pagination.limit ?? 50,
      offset: pagination.offset ?? 0,
    });
  }

  // Owner/operator approves or rejects
  @ApiOperation({ summary: 'Approve or reject a join request' })
  @ApiResponse({ status: 200, description: 'Request resolved' })
  @ApiResponse({ status: 404, description: 'Join request not found' })
  @UseGuards(JwtAccessGuard, OrganizationMembershipGuard, MembershipRolesGuard)
  @RequireMembershipRoles('owner', 'operator')
  @Patch('organizations/:organizationId/join-requests/:requestId')
  async resolveJoinRequest(
    @CurrentUser() user: CurrentUserType,
    @CurrentTenant() tenant: TenantContext,
    @Param('requestId') requestId: string,
    @Body() dto: ResolveJoinRequestDto,
  ) {
    const result = await this.membershipsService.resolveJoinRequest({
      requestId,
      organizationId: tenant.organizationId,
      resolvedByUserId: user.userId,
      decision: dto.decision,
    });
    const event = dto.decision === 'approved'
      ? CoreEvents.JOIN_REQUEST_APPROVED
      : CoreEvents.JOIN_REQUEST_REJECTED;
    this.eventPublisher.emit(event, {
      requestId,
      organizationId: tenant.organizationId,
      userEmail: result.userEmail,
      decision: dto.decision,
    });
    return result;
  }

  @ApiOperation({ summary: 'Accept a membership invite via token' })
  @ApiResponse({ status: 201, description: 'Invite accepted, membership created' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @UseGuards(JwtAccessGuard)
  @Post('memberships/accept-invite')
  async acceptInvite(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: AcceptInviteDto,
  ) {
    return this.membershipsService.acceptInvite({
      token: dto.token,
      userId: user.userId,
      userEmail: user.email,
    });
  }
}
