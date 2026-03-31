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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GatewayAuthGuard } from '../../common/guards/gateway-auth.guard';
import { GatewayUser } from '../../common/decorators/gateway-user.decorator';
import type { GatewayUser as GatewayUserType } from '../../common/decorators/gateway-user.decorator';
import { PaginationQueryDto } from '@tobiira/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import type { AmenityLevel } from './schemas/amenity.schema';

@ApiTags('properties')
@UseGuards(GatewayAuthGuard)
@Controller()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // ── Properties ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create a new property' })
  @ApiResponse({ status: 201, description: 'Property created' })
  @Post('properties')
  async createProperty(
    @GatewayUser() user: GatewayUserType,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertiesService.createProperty({
      organizationId: user.organizationId,
      userId: user.userId,
      name: dto.name,
      address: dto.address,
      location: dto.location,
      type: dto.type,
    });
  }

  @ApiOperation({ summary: 'List properties for the organization' })
  @ApiResponse({ status: 200, description: 'Property list' })
  @Get('properties')
  async listProperties(
    @GatewayUser() user: GatewayUserType,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.propertiesService.listProperties(user.organizationId, {
      limit: pagination.limit ?? 50,
      offset: pagination.offset ?? 0,
    });
  }

  @ApiOperation({ summary: 'Get a property by ID' })
  @ApiResponse({ status: 200, description: 'Property details' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @Get('properties/:propertyId')
  async getProperty(
    @GatewayUser() user: GatewayUserType,
    @Param('propertyId') propertyId: string,
  ) {
    return this.propertiesService.getProperty(user.organizationId, propertyId);
  }

  @ApiOperation({ summary: 'Update a property' })
  @ApiResponse({ status: 200, description: 'Property updated' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @Patch('properties/:propertyId')
  async updateProperty(
    @GatewayUser() user: GatewayUserType,
    @Param('propertyId') propertyId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertiesService.updateProperty(user.organizationId, propertyId, dto);
  }

  @ApiOperation({ summary: 'Delete a property' })
  @ApiResponse({ status: 204, description: 'Property deleted' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('properties/:propertyId')
  async deleteProperty(
    @GatewayUser() user: GatewayUserType,
    @Param('propertyId') propertyId: string,
  ): Promise<void> {
    await this.propertiesService.deleteProperty(user.organizationId, propertyId);
  }

  // ── Blocks ───────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create a block within a property' })
  @ApiResponse({ status: 201, description: 'Block created' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @Post('properties/:propertyId/blocks')
  async createBlock(
    @GatewayUser() user: GatewayUserType,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.propertiesService.createBlock({
      organizationId: user.organizationId,
      propertyId,
      name: dto.name,
      description: dto.description,
    });
  }

  @ApiOperation({ summary: 'List blocks within a property' })
  @ApiResponse({ status: 200, description: 'Block list' })
  @Get('properties/:propertyId/blocks')
  async listBlocks(
    @GatewayUser() user: GatewayUserType,
    @Param('propertyId') propertyId: string,
  ) {
    return this.propertiesService.listBlocks(user.organizationId, propertyId);
  }

  @ApiOperation({ summary: 'Get a block by ID' })
  @ApiResponse({ status: 200, description: 'Block details' })
  @ApiResponse({ status: 404, description: 'Block not found' })
  @Get('properties/:propertyId/blocks/:blockId')
  async getBlock(
    @GatewayUser() user: GatewayUserType,
    @Param('blockId') blockId: string,
  ) {
    return this.propertiesService.getBlock(user.organizationId, blockId);
  }

  @ApiOperation({ summary: 'Update a block' })
  @ApiResponse({ status: 200, description: 'Block updated' })
  @ApiResponse({ status: 404, description: 'Block not found' })
  @Patch('properties/:propertyId/blocks/:blockId')
  async updateBlock(
    @GatewayUser() user: GatewayUserType,
    @Param('blockId') blockId: string,
    @Body() dto: Partial<CreateBlockDto>,
  ) {
    return this.propertiesService.updateBlock(user.organizationId, blockId, dto);
  }

  @ApiOperation({ summary: 'Delete a block' })
  @ApiResponse({ status: 204, description: 'Block deleted' })
  @ApiResponse({ status: 404, description: 'Block not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('properties/:propertyId/blocks/:blockId')
  async deleteBlock(
    @GatewayUser() user: GatewayUserType,
    @Param('blockId') blockId: string,
  ): Promise<void> {
    await this.propertiesService.deleteBlock(user.organizationId, blockId);
  }

  // ── Units ────────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create a unit within a property' })
  @ApiResponse({ status: 201, description: 'Unit created' })
  @ApiResponse({ status: 404, description: 'Property or block not found' })
  @Post('properties/:propertyId/units')
  async createUnit(
    @GatewayUser() user: GatewayUserType,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.propertiesService.createUnit({
      organizationId: user.organizationId,
      propertyId,
      blockId: dto.blockId ?? null,
      name: dto.name,
      description: dto.description,
      rentAmount: dto.rentAmount,
      currency: dto.currency,
      paymentFrequency: dto.paymentFrequency,
      floorNumber: dto.floorNumber,
      sizeSqm: dto.sizeSqm,
    });
  }

  @ApiOperation({ summary: 'List units within a property' })
  @ApiResponse({ status: 200, description: 'Unit list' })
  @Get('properties/:propertyId/units')
  async listUnits(
    @GatewayUser() user: GatewayUserType,
    @Param('propertyId') propertyId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.propertiesService.listUnits(user.organizationId, propertyId, {
      limit: pagination.limit ?? 50,
      offset: pagination.offset ?? 0,
    });
  }

  @ApiOperation({ summary: 'Get a unit by ID' })
  @ApiResponse({ status: 200, description: 'Unit details' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @Get('units/:unitId')
  async getUnit(
    @GatewayUser() user: GatewayUserType,
    @Param('unitId') unitId: string,
  ) {
    return this.propertiesService.getUnit(user.organizationId, unitId);
  }

  @ApiOperation({ summary: 'Update a unit' })
  @ApiResponse({ status: 200, description: 'Unit updated' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @Patch('units/:unitId')
  async updateUnit(
    @GatewayUser() user: GatewayUserType,
    @Param('unitId') unitId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.propertiesService.updateUnit(user.organizationId, unitId, dto);
  }

  @ApiOperation({ summary: 'Delete a unit' })
  @ApiResponse({ status: 204, description: 'Unit deleted' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('units/:unitId')
  async deleteUnit(
    @GatewayUser() user: GatewayUserType,
    @Param('unitId') unitId: string,
  ): Promise<void> {
    await this.propertiesService.deleteUnit(user.organizationId, unitId);
  }

  // ── Amenities ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create an amenity attached to a property, block, or unit' })
  @ApiResponse({ status: 201, description: 'Amenity created' })
  @Post('amenities')
  async createAmenity(
    @GatewayUser() user: GatewayUserType,
    @Body() dto: CreateAmenityDto,
  ) {
    return this.propertiesService.createAmenity({
      organizationId: user.organizationId,
      level: dto.level,
      ownerId: dto.ownerId,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      capacity: dto.capacity,
    });
  }

  @ApiOperation({ summary: 'List amenities by owner and level' })
  @ApiResponse({ status: 200, description: 'Amenity list' })
  @Get('amenities')
  async listAmenities(
    @GatewayUser() user: GatewayUserType,
    @Query('ownerId') ownerId: string,
    @Query('level') level: AmenityLevel,
  ) {
    return this.propertiesService.listAmenities(user.organizationId, ownerId, level);
  }

  @ApiOperation({ summary: 'Update an amenity' })
  @ApiResponse({ status: 200, description: 'Amenity updated' })
  @ApiResponse({ status: 404, description: 'Amenity not found' })
  @Patch('amenities/:amenityId')
  async updateAmenity(
    @GatewayUser() user: GatewayUserType,
    @Param('amenityId') amenityId: string,
    @Body() dto: Partial<CreateAmenityDto>,
  ) {
    return this.propertiesService.updateAmenity(user.organizationId, amenityId, dto);
  }

  @ApiOperation({ summary: 'Delete an amenity' })
  @ApiResponse({ status: 204, description: 'Amenity deleted' })
  @ApiResponse({ status: 404, description: 'Amenity not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('amenities/:amenityId')
  async deleteAmenity(
    @GatewayUser() user: GatewayUserType,
    @Param('amenityId') amenityId: string,
  ): Promise<void> {
    await this.propertiesService.deleteAmenity(user.organizationId, amenityId);
  }
}
