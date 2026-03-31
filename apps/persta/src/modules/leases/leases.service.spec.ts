import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LeasesService } from './leases.service';
import type { LeasesRepository } from './leases.repository';
import type { UnitsRepository } from '../properties/units.repository';
import type { PropertiesRepository } from '../properties/properties.repository';
import type { TenantsRepository } from '../tenants/tenants.repository';
import type { EventPublisher } from '../../rabbitmq/event-publisher.service';
import type { CoreClientService } from '../../core-client/core-client.service';

const makeLeasesRepo = (overrides: Partial<LeasesRepository> = {}): LeasesRepository =>
  ({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(null),
    findByOrganization: jest.fn().mockResolvedValue([]),
    findByTenant: jest.fn().mockResolvedValue([]),
    ...overrides,
  }) as unknown as LeasesRepository;

const makeUnitsRepo = (overrides: Partial<UnitsRepository> = {}): UnitsRepository =>
  ({
    findById: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as UnitsRepository;

const makePropertiesRepo = (overrides: Partial<PropertiesRepository> = {}): PropertiesRepository =>
  ({
    findById: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as PropertiesRepository;

const makeTenantsRepo = (overrides: Partial<TenantsRepository> = {}): TenantsRepository =>
  ({
    findById: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as TenantsRepository;

const makePublisher = (): EventPublisher => ({ emit: jest.fn() }) as unknown as EventPublisher;

const makeCoreClient = (): CoreClientService =>
  ({ getOrganizationName: jest.fn().mockResolvedValue('Acme Corp') }) as unknown as CoreClientService;

const makeUnit = (overrides: object = {}) => ({
  _id: 'unit1',
  organizationId: 'org1',
  propertyId: 'prop1',
  name: 'Unit 1A',
  rentAmount: 1200,
  currency: 'KES',
  paymentFrequency: 'monthly',
  status: 'vacant',
  ...overrides,
});

const makeTenant = (overrides: object = {}) => ({
  _id: 'tenant1',
  organizationId: 'org1',
  email: 'tenant@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  ...overrides,
});

const makeLease = (overrides: object = {}) => ({
  _id: 'lease1',
  organizationId: 'org1',
  unitId: 'unit1',
  tenantId: 'tenant1',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2026-01-01'),
  rentAmount: 1200,
  currency: 'KES',
  paymentFrequency: 'monthly',
  depositAmount: 2400,
  status: 'pending',
  terminatedAt: null,
  terminatedReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeService = (overrides: {
  leases?: Partial<LeasesRepository>;
  units?: Partial<UnitsRepository>;
  properties?: Partial<PropertiesRepository>;
  tenants?: Partial<TenantsRepository>;
  publisher?: EventPublisher;
  core?: CoreClientService;
} = {}) =>
  new LeasesService(
    makeLeasesRepo(overrides.leases),
    makeUnitsRepo(overrides.units),
    makePropertiesRepo(overrides.properties),
    makeTenantsRepo(overrides.tenants),
    overrides.publisher ?? makePublisher(),
    overrides.core ?? makeCoreClient(),
  );

// ── createLease ───────────────────────────────────────────────────────────────

describe('LeasesService.createLease', () => {
  it('creates a lease, marks unit occupied, and emits LEASE_CREATED', async () => {
    const lease = makeLease({ status: 'pending' });
    const create = jest.fn().mockResolvedValue(lease);
    const updateUnit = jest.fn().mockResolvedValue(makeUnit({ status: 'occupied' }));
    const emit = jest.fn();

    const service = makeService({
      leases: { create },
      units: {
        findById: jest.fn().mockResolvedValue(makeUnit()),
        update: updateUnit,
      },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
      publisher: { emit } as unknown as EventPublisher,
    });

    const result = await service.createLease({
      organizationId: 'org1',
      unitId: 'unit1',
      tenantId: 'tenant1',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2026-01-01'),
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(updateUnit).toHaveBeenCalledWith('unit1', { status: 'occupied' });
    expect(emit).toHaveBeenCalledTimes(1);
    const [event] = emit.mock.calls[0];
    expect(event).toBe('persta.lease.created');
    expect(result.id).toBe('lease1');
  });

  it('throws NotFoundException when unit not found', async () => {
    const service = makeService();
    await expect(
      service.createLease({
        organizationId: 'org1',
        unitId: 'nope',
        tenantId: 'tenant1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-01'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when unit belongs to a different org', async () => {
    const service = makeService({
      units: { findById: jest.fn().mockResolvedValue(makeUnit({ organizationId: 'other' })) },
    });
    await expect(
      service.createLease({
        organizationId: 'org1',
        unitId: 'unit1',
        tenantId: 'tenant1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-01'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when unit is already occupied', async () => {
    const service = makeService({
      units: { findById: jest.fn().mockResolvedValue(makeUnit({ status: 'occupied' })) },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
    });
    await expect(
      service.createLease({
        organizationId: 'org1',
        unitId: 'unit1',
        tenantId: 'tenant1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-01'),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException when tenant not found', async () => {
    const service = makeService({
      units: { findById: jest.fn().mockResolvedValue(makeUnit()) },
    });
    await expect(
      service.createLease({
        organizationId: 'org1',
        unitId: 'unit1',
        tenantId: 'nope',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-01'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when startDate >= endDate', async () => {
    const service = makeService({
      units: { findById: jest.fn().mockResolvedValue(makeUnit()) },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
    });
    await expect(
      service.createLease({
        organizationId: 'org1',
        unitId: 'unit1',
        tenantId: 'tenant1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2025-01-01'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses unit rentAmount as default when not overridden', async () => {
    const create = jest.fn().mockResolvedValue(makeLease());
    const service = makeService({
      leases: { create },
      units: {
        findById: jest.fn().mockResolvedValue(makeUnit({ rentAmount: 1500 })),
        update: jest.fn().mockResolvedValue(null),
      },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
    });

    await service.createLease({
      organizationId: 'org1',
      unitId: 'unit1',
      tenantId: 'tenant1',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2026-01-01'),
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ rentAmount: 1500 }));
  });
});

// ── activateLease ─────────────────────────────────────────────────────────────

describe('LeasesService.activateLease', () => {
  it('activates a pending lease and emits LEASE_ACTIVATED', async () => {
    const activated = makeLease({ status: 'active' });
    const update = jest.fn().mockResolvedValue(activated);
    const emit = jest.fn();

    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease({ status: 'pending' })), update },
      units: { findById: jest.fn().mockResolvedValue(makeUnit()) },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
      publisher: { emit } as unknown as EventPublisher,
    });

    const result = await service.activateLease('org1', 'lease1');
    expect(result.status).toBe('active');
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toBe('persta.lease.activated');
  });

  it('throws BadRequestException when lease is not pending', async () => {
    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease({ status: 'active' })) },
    });
    await expect(service.activateLease('org1', 'lease1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when lease not found', async () => {
    const service = makeService();
    await expect(service.activateLease('org1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ── terminateLease ────────────────────────────────────────────────────────────

describe('LeasesService.terminateLease', () => {
  it('terminates an active lease, frees the unit, and emits LEASE_TERMINATED', async () => {
    const terminated = makeLease({ status: 'terminated' });
    const update = jest.fn().mockResolvedValue(terminated);
    const updateUnit = jest.fn().mockResolvedValue(makeUnit({ status: 'vacant' }));
    const emit = jest.fn();

    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease({ status: 'active' })), update },
      units: { findById: jest.fn().mockResolvedValue(makeUnit()), update: updateUnit },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
      publisher: { emit } as unknown as EventPublisher,
    });

    const result = await service.terminateLease('org1', 'lease1', 'Tenant moved out');
    expect(result.status).toBe('terminated');
    expect(updateUnit).toHaveBeenCalledWith('unit1', { status: 'vacant' });
    expect(emit.mock.calls[0][0]).toBe('persta.lease.terminated');
  });

  it('throws BadRequestException when lease is already closed', async () => {
    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease({ status: 'terminated' })) },
    });
    await expect(service.terminateLease('org1', 'lease1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ── renewLease ────────────────────────────────────────────────────────────────

describe('LeasesService.renewLease', () => {
  it('extends the end date and emits LEASE_RENEWED', async () => {
    const renewed = makeLease({ endDate: new Date('2027-01-01'), status: 'active' });
    const update = jest.fn().mockResolvedValue(renewed);
    const emit = jest.fn();

    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease({ status: 'active' })), update },
      units: { findById: jest.fn().mockResolvedValue(makeUnit()), update: jest.fn() },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
      publisher: { emit } as unknown as EventPublisher,
    });

    const result = await service.renewLease('org1', 'lease1', { newEndDate: new Date('2027-01-01') });
    expect(result.endDate).toEqual(new Date('2027-01-01'));
    expect(emit.mock.calls[0][0]).toBe('persta.lease.renewed');
  });

  it('throws BadRequestException when renewing a terminated lease', async () => {
    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease({ status: 'terminated' })) },
    });
    await expect(
      service.renewLease('org1', 'lease1', { newEndDate: new Date('2027-01-01') }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when newEndDate is not after current endDate', async () => {
    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease({ status: 'active', endDate: new Date('2026-01-01') })) },
    });
    await expect(
      service.renewLease('org1', 'lease1', { newEndDate: new Date('2025-06-01') }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('re-occupies the unit when renewing an expired lease', async () => {
    const renewed = makeLease({ status: 'active', endDate: new Date('2027-01-01') });
    const update = jest.fn().mockResolvedValue(renewed);
    const updateUnit = jest.fn().mockResolvedValue(null);
    const emit = jest.fn();

    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease({ status: 'expired', endDate: new Date('2025-12-01') })), update },
      units: { findById: jest.fn().mockResolvedValue(makeUnit()), update: updateUnit },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
      publisher: { emit } as unknown as EventPublisher,
    });

    await service.renewLease('org1', 'lease1', { newEndDate: new Date('2027-01-01') });
    expect(updateUnit).toHaveBeenCalledWith('unit1', { status: 'occupied' });
  });
});

// ── getLeaseInternal ──────────────────────────────────────────────────────────

describe('LeasesService.getLeaseInternal', () => {
  it('returns hydrated lease with tenant/unit context', async () => {
    const service = makeService({
      leases: { findById: jest.fn().mockResolvedValue(makeLease()) },
      units: { findById: jest.fn().mockResolvedValue(makeUnit()) },
      tenants: { findById: jest.fn().mockResolvedValue(makeTenant()) },
      properties: { findById: jest.fn().mockResolvedValue({ _id: 'prop1', organizationId: 'org1', name: 'Sunrise Apartments' }) },
    });

    const result = await service.getLeaseInternal('lease1');
    expect(result.id).toBe('lease1');
    expect(result.tenantEmail).toBe('tenant@example.com');
    expect(result.tenantName).toBe('Alice Smith');
    expect(result.unitName).toBe('Unit 1A');
    expect(result.propertyName).toBe('Sunrise Apartments');
    expect(result.organizationName).toBe('Acme Corp');
  });

  it('throws NotFoundException when lease does not exist', async () => {
    const service = makeService();
    await expect(service.getLeaseInternal('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
