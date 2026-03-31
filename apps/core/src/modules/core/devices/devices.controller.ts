import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { OrganizationMembershipGuard } from '../memberships/guards/organization-membership.guard';
import { MembershipRolesGuard } from '../roles/guards/membership-roles.guard';
import { RequireMembershipRoles } from '../roles/decorators/require-membership-roles.decorator';
import { CurrentTenant } from '../memberships/decorators/current-tenant.decorator';
import type { TenantContext } from '../memberships/decorators/current-tenant.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DevicesService } from './devices.service';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, OrganizationMembershipGuard, MembershipRolesGuard)
@RequireMembershipRoles('owner', 'operator')
@Controller('organizations/:organizationId/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  async register(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.devicesService.registerDevice({
      organizationId: tenant.organizationId,
      name: dto.name,
      hardwareId: dto.hardwareId,
    });
  }

  @Get()
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.devicesService.listDevices({
      organizationId: tenant.organizationId,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':deviceId')
  async revoke(
    @CurrentTenant() tenant: TenantContext,
    @Param('deviceId') deviceId: string,
  ): Promise<void> {
    return this.devicesService.revokeDevice({
      organizationId: tenant.organizationId,
      deviceId,
    });
  }
}
