import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PropertiesRepository } from './properties.repository';
import { BlocksRepository } from './blocks.repository';
import { UnitsRepository } from './units.repository';
import { AmenitiesRepository } from './amenities.repository';
import type { PropertyType } from './schemas/property.schema';
import type { UnitStatus, PaymentFrequency } from './schemas/unit.schema';
import type { AmenityLevel, AmenityStatus } from './schemas/amenity.schema';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly propertiesRepository: PropertiesRepository,
    private readonly blocksRepository: BlocksRepository,
    private readonly unitsRepository: UnitsRepository,
    private readonly amenitiesRepository: AmenitiesRepository,
  ) {}

  // ── Properties ──────────────────────────────────────────────────────────────

  async createProperty(params: {
    organizationId: string;
    userId: string;
    name: string;
    address?: string;
    location?: { lat: number; lng: number };
    type: PropertyType;
  }) {
    const property = await this.propertiesRepository.create({
      organizationId: params.organizationId,
      name: params.name,
      address: params.address,
      location: params.location,
      type: params.type,
      createdByUserId: params.userId,
    });
    return this.mapProperty(property);
  }

  async getProperty(organizationId: string, propertyId: string) {
    const property = await this.propertiesRepository.findById(propertyId);
    if (!property || String(property.organizationId) !== organizationId) {
      throw new NotFoundException('Property not found');
    }
    return this.mapProperty(property);
  }

  async listProperties(
    organizationId: string,
    pagination: { limit: number; offset: number },
  ) {
    const items = await this.propertiesRepository.findByOrganization(organizationId, pagination);
    return { items: items.map((p) => this.mapProperty(p)) };
  }

  async updateProperty(
    organizationId: string,
    propertyId: string,
    patch: Partial<{ name: string; address: string; location: { lat: number; lng: number }; type: PropertyType }>,
  ) {
    const property = await this.propertiesRepository.findById(propertyId);
    if (!property || String(property.organizationId) !== organizationId) {
      throw new NotFoundException('Property not found');
    }
    const updated = await this.propertiesRepository.update(propertyId, patch);
    return this.mapProperty(updated!);
  }

  async deleteProperty(organizationId: string, propertyId: string) {
    const property = await this.propertiesRepository.findById(propertyId);
    if (!property || String(property.organizationId) !== organizationId) {
      throw new NotFoundException('Property not found');
    }
    await this.propertiesRepository.delete(propertyId);
  }

  // ── Blocks ───────────────────────────────────────────────────────────────────

  async createBlock(params: {
    organizationId: string;
    propertyId: string;
    name: string;
    description?: string;
  }) {
    await this.assertPropertyOwnership(params.organizationId, params.propertyId);
    const block = await this.blocksRepository.create(params);
    return this.mapBlock(block);
  }

  async getBlock(organizationId: string, blockId: string) {
    const block = await this.assertBlockOwnership(organizationId, blockId);
    return this.mapBlock(block);
  }

  async listBlocks(organizationId: string, propertyId: string) {
    await this.assertPropertyOwnership(organizationId, propertyId);
    const items = await this.blocksRepository.findByProperty(propertyId);
    return { items: items.map((b) => this.mapBlock(b)) };
  }

  async updateBlock(
    organizationId: string,
    blockId: string,
    patch: Partial<{ name: string; description: string }>,
  ) {
    const block = await this.assertBlockOwnership(organizationId, blockId);
    const updated = await this.blocksRepository.update(String(block._id), patch);
    return this.mapBlock(updated!);
  }

  async deleteBlock(organizationId: string, blockId: string) {
    await this.assertBlockOwnership(organizationId, blockId);
    await this.blocksRepository.delete(blockId);
  }

  // ── Units ────────────────────────────────────────────────────────────────────

  async createUnit(params: {
    organizationId: string;
    propertyId: string;
    blockId?: string | null;
    name: string;
    description?: string;
    rentAmount: number;
    currency: string;
    paymentFrequency: PaymentFrequency;
    floorNumber?: number;
    sizeSqm?: number;
  }) {
    await this.assertPropertyOwnership(params.organizationId, params.propertyId);
    if (params.blockId) {
      await this.assertBlockOwnership(params.organizationId, params.blockId);
    }
    const unit = await this.unitsRepository.create(params);
    return this.mapUnit(unit);
  }

  async getUnit(organizationId: string, unitId: string) {
    const unit = await this.unitsRepository.findById(unitId);
    if (!unit || String(unit.organizationId) !== organizationId) {
      throw new NotFoundException('Unit not found');
    }
    return this.mapUnit(unit);
  }

  async listUnits(
    organizationId: string,
    propertyId: string,
    pagination: { limit: number; offset: number },
  ) {
    await this.assertPropertyOwnership(organizationId, propertyId);
    const items = await this.unitsRepository.findByProperty(propertyId, pagination);
    return { items: items.map((u) => this.mapUnit(u)) };
  }

  async updateUnit(
    organizationId: string,
    unitId: string,
    patch: Partial<{
      name: string;
      description: string;
      rentAmount: number;
      currency: string;
      paymentFrequency: PaymentFrequency;
      status: UnitStatus;
      floorNumber: number;
      sizeSqm: number;
    }>,
  ) {
    const unit = await this.unitsRepository.findById(unitId);
    if (!unit || String(unit.organizationId) !== organizationId) {
      throw new NotFoundException('Unit not found');
    }
    const updated = await this.unitsRepository.update(unitId, patch);
    return this.mapUnit(updated!);
  }

  async deleteUnit(organizationId: string, unitId: string) {
    const unit = await this.unitsRepository.findById(unitId);
    if (!unit || String(unit.organizationId) !== organizationId) {
      throw new NotFoundException('Unit not found');
    }
    await this.unitsRepository.delete(unitId);
  }

  // ── Amenities ────────────────────────────────────────────────────────────────

  async createAmenity(params: {
    organizationId: string;
    level: AmenityLevel;
    ownerId: string;
    name: string;
    description?: string;
    type?: string;
    capacity?: number;
  }) {
    const amenity = await this.amenitiesRepository.create(params);
    return this.mapAmenity(amenity);
  }

  async listAmenities(organizationId: string, ownerId: string, level: AmenityLevel) {
    const items = await this.amenitiesRepository.findByOwner(ownerId, level);
    return { items: items.map((a) => this.mapAmenity(a)) };
  }

  async updateAmenity(
    organizationId: string,
    amenityId: string,
    patch: Partial<{ name: string; description: string; type: string; capacity: number; status: AmenityStatus }>,
  ) {
    const amenity = await this.amenitiesRepository.findById(amenityId);
    if (!amenity || String(amenity.organizationId) !== organizationId) {
      throw new NotFoundException('Amenity not found');
    }
    const updated = await this.amenitiesRepository.update(amenityId, patch);
    return this.mapAmenity(updated!);
  }

  async deleteAmenity(organizationId: string, amenityId: string) {
    const amenity = await this.amenitiesRepository.findById(amenityId);
    if (!amenity || String(amenity.organizationId) !== organizationId) {
      throw new NotFoundException('Amenity not found');
    }
    await this.amenitiesRepository.delete(amenityId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async assertPropertyOwnership(organizationId: string, propertyId: string) {
    const property = await this.propertiesRepository.findById(propertyId);
    if (!property || String(property.organizationId) !== organizationId) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  private async assertBlockOwnership(organizationId: string, blockId: string) {
    const block = await this.blocksRepository.findById(blockId);
    if (!block || String(block.organizationId) !== organizationId) {
      throw new NotFoundException('Block not found');
    }
    return block;
  }

  private mapProperty(p: any) {
    return {
      id: String(p._id),
      organizationId: String(p.organizationId),
      name: p.name,
      address: p.address ?? undefined,
      location: p.location ? { lat: p.location.lat, lng: p.location.lng } : undefined,
      type: p.type,
      createdByUserId: String(p.createdByUserId),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapBlock(b: any) {
    return {
      id: String(b._id),
      organizationId: String(b.organizationId),
      propertyId: String(b.propertyId),
      name: b.name,
      description: b.description ?? undefined,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  private mapUnit(u: any) {
    return {
      id: String(u._id),
      organizationId: String(u.organizationId),
      propertyId: String(u.propertyId),
      blockId: u.blockId ? String(u.blockId) : null,
      name: u.name,
      description: u.description ?? undefined,
      rentAmount: u.rentAmount,
      currency: u.currency,
      paymentFrequency: u.paymentFrequency,
      status: u.status,
      floorNumber: u.floorNumber ?? undefined,
      sizeSqm: u.sizeSqm ?? undefined,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  private mapAmenity(a: any) {
    return {
      id: String(a._id),
      organizationId: String(a.organizationId),
      level: a.level,
      ownerId: String(a.ownerId),
      name: a.name,
      description: a.description ?? undefined,
      type: a.type ?? undefined,
      capacity: a.capacity ?? undefined,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}
