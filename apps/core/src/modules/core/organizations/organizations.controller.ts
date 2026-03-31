import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { OrganizationMembershipGuard } from '../memberships/guards/organization-membership.guard';
import { MembershipRolesGuard } from '../roles/guards/membership-roles.guard';
import { RequireMembershipRoles } from '../roles/decorators/require-membership-roles.decorator';
import { CurrentTenant } from '../memberships/decorators/current-tenant.decorator';
import type { TenantContext } from '../memberships/decorators/current-tenant.decorator';
import type { MembershipRole } from '../roles/membership-role';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { OrganizationsService } from './organizations.service';
import { InternalApiKeyGuard } from '../../../common/guards/internal-api-key.guard';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created' })
  @Post()
  async createOrganization(
    @CurrentUser() user: CurrentUser,
    @Body() dto: CreateOrganizationDto,
  ): Promise<{
    id: string;
    name: string;
    address?: string;
    location?: { lat: number; lng: number };
    role: MembershipRole;
  }> {
    return this.organizationsService.createOrganization({
      userId: user.userId,
      userEmail: user.email,
      name: dto.name,
      address: dto.address,
      location: dto.location
        ? { lat: dto.location.lat, lng: dto.location.lng }
        : undefined,
    });
  }

  // Internal — called by verticals to resolve org name/plan for notifications and entitlement checks
  @ApiOperation({ summary: '[Internal] Get organization by ID — service-to-service only' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @UseGuards(InternalApiKeyGuard)
  @Get(':organizationId/internal')
  async getOrganizationInternal(@Param('organizationId') organizationId: string) {
    return this.organizationsService.getOrganizationById(organizationId);
  }

  // Internal — called by billing service to update feature flags after addon purchase/expiry
  @ApiOperation({ summary: '[Internal] Update organization plan — service-to-service only' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  @UseGuards(InternalApiKeyGuard)
  @Patch(':organizationId/plan/internal')
  async updatePlanInternal(
    @Param('organizationId') organizationId: string,
    @Body() body: { featureFlags?: string[]; billingRef?: string | null },
  ) {
    return this.organizationsService.updatePlan(organizationId, body);
  }

  @ApiOperation({ summary: 'Get organization settings' })
  @ApiResponse({ status: 200, description: 'Organization settings' })
  @UseGuards(OrganizationMembershipGuard, MembershipRolesGuard)
  @RequireMembershipRoles('owner', 'operator')
  @Get(':organizationId/settings')
  async getSettings(@CurrentTenant() tenant: TenantContext) {
    return this.organizationsService.getSettings(tenant.organizationId);
  }

  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  @UseGuards(OrganizationMembershipGuard, MembershipRolesGuard)
  @RequireMembershipRoles('owner')
  @Put(':organizationId/settings')
  async updateSettings(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizationsService.updateSettings(tenant.organizationId, dto);
  }

  @ApiOperation({ summary: 'List organizations the current user belongs to' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  @Get()
  async listOrganizations(
    @CurrentUser() user: CurrentUser,
    @Query() pagination: PaginationQueryDto,
  ): Promise<{
    items: Array<{
      id: string;
      name: string;
      address?: string;
      location?: { lat: number; lng: number };
      role: MembershipRole | 'unknown';
    }>;
  }> {
    return this.organizationsService.listOrganizationsForUser({
      userId: user.userId,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }
}
