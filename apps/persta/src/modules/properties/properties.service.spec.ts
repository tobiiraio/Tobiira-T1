import { NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import type { PropertiesRepository } from './properties.repository';
import type { BlocksRepository } from './blocks.repository';
import type { UnitsRepository } from './units.repository';
import type { AmenitiesRepository } from './amenities.repository';

const makePropertiesRepo = (overrides: Partial<PropertiesRepository> = {}): PropertiesRepository =>
  ({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByOrganization: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as PropertiesRepository;

const makeBlocksRepo = (overrides: Partial<BlocksRepository> = {}): BlocksRepository =>
  ({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByProperty: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as BlocksRepository;

const makeUnitsRepo = (overrides: Partial<UnitsRepository> = {}): UnitsRepository =>
  ({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByProperty: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as UnitsRepository;

const makeAmenitiesRepo = (overrides: Partial<AmenitiesRepository> = {}): AmenitiesRepository =>
  ({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByOwner: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as AmenitiesRepository;

const makeService = (overrides: {
  properties?: Partial<PropertiesRepository>;
  blocks?: Partial<BlocksRepository>;
  units?: Partial<UnitsRepository>;
  amenities?: Partial<AmenitiesRepository>;
} = {}) =>
  new PropertiesService(
    makePropertiesRepo(overrides.properties),
    makeBlocksRepo(overrides.blocks),
    makeUnitsRepo(overrides.units),
    makeAmenitiesRepo(overrides.amenities),
  );

const makeProperty = (overrides: object = {}) => ({
  _id: 'prop1',
  organizationId: 'org1',
  name: 'Sunrise Apartments',
  address: '123 Main St',
  type: 'residential',
  createdByUserId: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeBlock = (overrides: object = {}) => ({
  _id: 'block1',
  organizationId: 'org1',
  propertyId: 'prop1',
  name: 'Block A',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeUnit = (overrides: object = {}) => ({
  _id: 'unit1',
  organizationId: 'org1',
  propertyId: 'prop1',
  blockId: null,
  name: 'Unit 1A',
  rentAmount: 1200,
  currency: 'KES',
  paymentFrequency: 'monthly',
  status: 'vacant',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ── Properties ────────────────────────────────────────────────────────────────

describe('PropertiesService.getProperty', () => {
  it('returns mapped property when found', async () => {
    const service = makeService({
      properties: { findById: jest.fn().mockResolvedValue(makeProperty()) },
    });
    const result = await service.getProperty('org1', 'prop1');
    expect(result.id).toBe('prop1');
    expect(result.name).toBe('Sunrise Apartments');
  });

  it('throws NotFoundException when property not found', async () => {
    const service = makeService();
    await expect(service.getProperty('org1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when property belongs to a different org', async () => {
    const service = makeService({
      properties: { findById: jest.fn().mockResolvedValue(makeProperty({ organizationId: 'other' })) },
    });
    await expect(service.getProperty('org1', 'prop1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PropertiesService.updateProperty', () => {
  it('updates and returns the mapped property', async () => {
    const updated = makeProperty({ name: 'New Name' });
    const update = jest.fn().mockResolvedValue(updated);

    const service = makeService({
      properties: {
        findById: jest.fn().mockResolvedValue(makeProperty()),
        update,
      },
    });

    const result = await service.updateProperty('org1', 'prop1', { name: 'New Name' });
    expect(update).toHaveBeenCalledWith('prop1', expect.objectContaining({ name: 'New Name' }));
    expect(result.name).toBe('New Name');
  });

  it('throws NotFoundException when property not found', async () => {
    const service = makeService();
    await expect(service.updateProperty('org1', 'nope', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PropertiesService.deleteProperty', () => {
  it('deletes the property', async () => {
    const deleteFn = jest.fn().mockResolvedValue(undefined);
    const service = makeService({
      properties: {
        findById: jest.fn().mockResolvedValue(makeProperty()),
        delete: deleteFn,
      },
    });
    await service.deleteProperty('org1', 'prop1');
    expect(deleteFn).toHaveBeenCalledWith('prop1');
  });

  it('throws NotFoundException when property not found', async () => {
    const service = makeService();
    await expect(service.deleteProperty('org1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ── Blocks ────────────────────────────────────────────────────────────────────

describe('PropertiesService.createBlock', () => {
  it('creates a block under a valid property', async () => {
    const create = jest.fn().mockResolvedValue(makeBlock());
    const service = makeService({
      properties: { findById: jest.fn().mockResolvedValue(makeProperty()) },
      blocks: { create },
    });

    const result = await service.createBlock({
      organizationId: 'org1',
      propertyId: 'prop1',
      name: 'Block A',
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('block1');
  });

  it('throws NotFoundException when property not found', async () => {
    const service = makeService();
    await expect(
      service.createBlock({ organizationId: 'org1', propertyId: 'nope', name: 'Block A' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PropertiesService.getBlock', () => {
  it('returns mapped block when found', async () => {
    const service = makeService({
      blocks: { findById: jest.fn().mockResolvedValue(makeBlock()) },
    });
    const result = await service.getBlock('org1', 'block1');
    expect(result.id).toBe('block1');
    expect(result.name).toBe('Block A');
  });

  it('throws NotFoundException when block not found', async () => {
    const service = makeService();
    await expect(service.getBlock('org1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when block belongs to a different org', async () => {
    const service = makeService({
      blocks: { findById: jest.fn().mockResolvedValue(makeBlock({ organizationId: 'other' })) },
    });
    await expect(service.getBlock('org1', 'block1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ── Units ─────────────────────────────────────────────────────────────────────

describe('PropertiesService.createUnit', () => {
  it('creates a unit under a valid property', async () => {
    const create = jest.fn().mockResolvedValue(makeUnit());
    const service = makeService({
      properties: { findById: jest.fn().mockResolvedValue(makeProperty()) },
      units: { create },
    });

    const result = await service.createUnit({
      organizationId: 'org1',
      propertyId: 'prop1',
      name: 'Unit 1A',
      rentAmount: 1200,
      currency: 'KES',
      paymentFrequency: 'monthly',
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('unit1');
  });

  it('throws NotFoundException when property not found', async () => {
    const service = makeService();
    await expect(
      service.createUnit({
        organizationId: 'org1',
        propertyId: 'nope',
        name: 'Unit 1A',
        rentAmount: 1200,
        currency: 'KES',
        paymentFrequency: 'monthly',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when blockId is provided but block not found', async () => {
    const service = makeService({
      properties: { findById: jest.fn().mockResolvedValue(makeProperty()) },
      blocks: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      service.createUnit({
        organizationId: 'org1',
        propertyId: 'prop1',
        blockId: 'nope',
        name: 'Unit 1A',
        rentAmount: 1200,
        currency: 'KES',
        paymentFrequency: 'monthly',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PropertiesService.getUnit', () => {
  it('returns mapped unit when found', async () => {
    const service = makeService({
      units: { findById: jest.fn().mockResolvedValue(makeUnit()) },
    });
    const result = await service.getUnit('org1', 'unit1');
    expect(result.id).toBe('unit1');
    expect(result.rentAmount).toBe(1200);
  });

  it('throws NotFoundException when unit not found', async () => {
    const service = makeService();
    await expect(service.getUnit('org1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when unit belongs to a different org', async () => {
    const service = makeService({
      units: { findById: jest.fn().mockResolvedValue(makeUnit({ organizationId: 'other' })) },
    });
    await expect(service.getUnit('org1', 'unit1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PropertiesService.updateUnit', () => {
  it('updates and returns the mapped unit', async () => {
    const updated = makeUnit({ rentAmount: 1500 });
    const update = jest.fn().mockResolvedValue(updated);
    const service = makeService({
      units: {
        findById: jest.fn().mockResolvedValue(makeUnit()),
        update,
      },
    });

    const result = await service.updateUnit('org1', 'unit1', { rentAmount: 1500 });
    expect(result.rentAmount).toBe(1500);
  });

  it('throws NotFoundException when unit not found', async () => {
    const service = makeService();
    await expect(service.updateUnit('org1', 'nope', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
