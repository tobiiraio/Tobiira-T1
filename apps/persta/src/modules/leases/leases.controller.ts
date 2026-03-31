import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GatewayAuthGuard } from '../../common/guards/gateway-auth.guard';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { GatewayUser } from '../../common/decorators/gateway-user.decorator';
import type { GatewayUser as GatewayUserType } from '../../common/decorators/gateway-user.decorator';
import { PaginationQueryDto } from '@tobiira/common';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';
import { RenewLeaseDto } from './dto/renew-lease.dto';
import type { LeaseStatus } from './schemas/lease.schema';

@ApiTags('leases')
@UseGuards(GatewayAuthGuard)
@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @ApiOperation({ summary: 'Create a new lease for a unit and tenant' })
  @ApiResponse({ status: 201, description: 'Lease created' })
  @ApiResponse({ status: 404, description: 'Unit or tenant not found' })
  @ApiResponse({ status: 409, description: 'Unit already occupied' })
  @Post()
  async createLease(
    @GatewayUser() user: GatewayUserType,
    @Body() dto: CreateLeaseDto,
  ) {
    return this.leasesService.createLease({
      organizationId: user.organizationId,
      unitId: dto.unitId,
      tenantId: dto.tenantId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      rentAmount: dto.rentAmount,
      depositAmount: dto.depositAmount,
    });
  }

  @ApiOperation({ summary: 'List leases for the organization' })
  @ApiResponse({ status: 200, description: 'Lease list' })
  @Get()
  async listLeases(
    @GatewayUser() user: GatewayUserType,
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: LeaseStatus,
  ) {
    return this.leasesService.listLeases(
      user.organizationId,
      { status },
      { limit: pagination.limit ?? 50, offset: pagination.offset ?? 0 },
    );
  }

  @ApiOperation({ summary: 'Get a single lease by ID' })
  @ApiResponse({ status: 200, description: 'Lease details' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  @Get(':leaseId')
  async getLease(
    @GatewayUser() user: GatewayUserType,
    @Param('leaseId') leaseId: string,
  ) {
    return this.leasesService.getLease(user.organizationId, leaseId);
  }

  @ApiOperation({ summary: 'Activate a pending lease' })
  @ApiResponse({ status: 200, description: 'Lease activated' })
  @ApiResponse({ status: 400, description: 'Lease is not pending' })
  @HttpCode(HttpStatus.OK)
  @Patch(':leaseId/activate')
  async activateLease(
    @GatewayUser() user: GatewayUserType,
    @Param('leaseId') leaseId: string,
  ) {
    return this.leasesService.activateLease(user.organizationId, leaseId);
  }

  @ApiOperation({ summary: 'Terminate an active lease' })
  @ApiResponse({ status: 200, description: 'Lease terminated' })
  @ApiResponse({ status: 400, description: 'Lease is already closed' })
  @HttpCode(HttpStatus.OK)
  @Patch(':leaseId/terminate')
  async terminateLease(
    @GatewayUser() user: GatewayUserType,
    @Param('leaseId') leaseId: string,
    @Body() dto: TerminateLeaseDto,
  ) {
    return this.leasesService.terminateLease(user.organizationId, leaseId, dto.reason);
  }

  @ApiOperation({ summary: 'Renew a lease with a new end date' })
  @ApiResponse({ status: 200, description: 'Lease renewed' })
  @ApiResponse({ status: 400, description: 'Cannot renew a terminated lease or new date is not after current end date' })
  @HttpCode(HttpStatus.OK)
  @Patch(':leaseId/renew')
  async renewLease(
    @GatewayUser() user: GatewayUserType,
    @Param('leaseId') leaseId: string,
    @Body() dto: RenewLeaseDto,
  ) {
    return this.leasesService.renewLease(user.organizationId, leaseId, {
      newEndDate: new Date(dto.newEndDate),
      rentAmount: dto.rentAmount,
    });
  }

  @ApiOperation({ summary: '[Internal] Get fully-hydrated lease — service-to-service only' })
  @ApiResponse({ status: 200, description: 'Hydrated lease with tenant and property context' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  // Internal endpoint — called by documents service to fetch full lease data for PDF generation
  @UseGuards(InternalApiKeyGuard)
  @Get(':leaseId/internal')
  async getLeaseInternal(@Param('leaseId') leaseId: string) {
    return this.leasesService.getLeaseInternal(leaseId);
  }
}
