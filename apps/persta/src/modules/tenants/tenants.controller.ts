import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GatewayAuthGuard } from '../../common/guards/gateway-auth.guard';
import { GatewayUser } from '../../common/decorators/gateway-user.decorator';
import type { GatewayUser as GatewayUserType } from '../../common/decorators/gateway-user.decorator';
import { PaginationQueryDto } from '@tobiira/common';
import { TenantsService } from './tenants.service';
import { EnrollTenantDto } from './dto/enroll-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('tenants')
@UseGuards(GatewayAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @ApiOperation({ summary: 'Enroll a user as a tenant in the organization' })
  @ApiResponse({ status: 201, description: 'Tenant enrolled' })
  @ApiResponse({ status: 409, description: 'User is already a tenant in this organization' })
  @Post()
  async enrollTenant(
    @GatewayUser() user: GatewayUserType,
    @Body() dto: EnrollTenantDto,
  ) {
    return this.tenantsService.enrollTenant({
      organizationId: user.organizationId,
      userId: dto.userId,
    });
  }

  @ApiOperation({ summary: 'List tenants in the organization' })
  @ApiResponse({ status: 200, description: 'Tenant list' })
  @Get()
  async listTenants(
    @GatewayUser() user: GatewayUserType,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.tenantsService.listTenants(user.organizationId, {
      limit: pagination.limit ?? 50,
      offset: pagination.offset ?? 0,
    });
  }

  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @Get(':tenantId')
  async getTenant(
    @GatewayUser() user: GatewayUserType,
    @Param('tenantId') tenantId: string,
  ) {
    return this.tenantsService.getTenant(user.organizationId, tenantId);
  }

  @ApiOperation({ summary: 'Update tenant details (ID document, emergency contact)' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @Patch(':tenantId')
  async updateTenant(
    @GatewayUser() user: GatewayUserType,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateTenant(user.organizationId, tenantId, {
      idType: dto.idType,
      idNumber: dto.idNumber,
      emergencyContact: dto.emergencyContact,
    });
  }
}
