import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import type { TenantsRepository } from './tenants.repository';
import type { CoreClientService } from '../../core-client/core-client.service';
import type { EventPublisher } from '../../rabbitmq/event-publisher.service';

const makeTenantsRepo = (overrides: Partial<TenantsRepository> = {}): TenantsRepository =>
  ({
    findByUserId: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    findByOrganization: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as TenantsRepository;

const makeCoreClient = (overrides: Partial<CoreClientService> = {}): CoreClientService =>
  ({
    getUserProfile: jest.fn().mockResolvedValue({
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      phone: '+254700000000',
    }),
    createMembership: jest.fn().mockResolvedValue(undefined),
    getOrganizationName: jest.fn().mockResolvedValue('Acme Corp'),
    ...overrides,
  }) as unknown as CoreClientService;

const makePublisher = (): EventPublisher => ({ emit: jest.fn() }) as unknown as EventPublisher;

const makeTenant = (overrides: object = {}) => ({
  _id: 't1',
  organizationId: 'org1',
  userId: 'u1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  phone: '+254700000000',
  idType: undefined,
  idNumber: undefined,
  emergencyContact: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeService = (overrides: {
  repo?: Partial<TenantsRepository>;
  core?: Partial<CoreClientService>;
  publisher?: EventPublisher;
} = {}) =>
  new TenantsService(
    makeTenantsRepo(overrides.repo),
    makeCoreClient(overrides.core),
    overrides.publisher ?? makePublisher(),
  );

// ── enrollTenant ──────────────────────────────────────────────────────────────

describe('TenantsService.enrollTenant', () => {
  it('creates tenant, registers membership in core, and emits TENANT_ENROLLED', async () => {
    const tenant = makeTenant();
    const create = jest.fn().mockResolvedValue(tenant);
    const createMembership = jest.fn().mockResolvedValue(undefined);
    const emit = jest.fn();

    const service = makeService({
      repo: { create },
      core: { createMembership },
      publisher: { emit } as unknown as EventPublisher,
    });

    const result = await service.enrollTenant({ organizationId: 'org1', userId: 'u1' });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org1',
      userId: 'u1',
      email: 'alice@example.com',
    }));
    expect(createMembership).toHaveBeenCalledWith({
      organizationId: 'org1',
      userId: 'u1',
      role: 'occupant',
    });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toBe('persta.tenant.enrolled');
    expect(result.id).toBe('t1');
    expect(result.email).toBe('alice@example.com');
  });

  it('throws ConflictException when user is already enrolled', async () => {
    const service = makeService({
      repo: { findByUserId: jest.fn().mockResolvedValue(makeTenant()) },
    });

    await expect(
      service.enrollTenant({ organizationId: 'org1', userId: 'u1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('denormalizes profile fields from core into the tenant record', async () => {
    const create = jest.fn().mockResolvedValue(makeTenant());
    const service = makeService({
      repo: { create },
      core: {
        getUserProfile: jest.fn().mockResolvedValue({
          email: 'bob@example.com',
          firstName: 'Bob',
          lastName: 'Jones',
          phone: undefined,
        }),
      },
    });

    await service.enrollTenant({ organizationId: 'org1', userId: 'u2' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Jones',
    }));
  });
});

// ── getTenant ─────────────────────────────────────────────────────────────────

describe('TenantsService.getTenant', () => {
  it('returns mapped tenant when found', async () => {
    const service = makeService({
      repo: { findById: jest.fn().mockResolvedValue(makeTenant()) },
    });

    const result = await service.getTenant('org1', 't1');
    expect(result.id).toBe('t1');
    expect(result.email).toBe('alice@example.com');
  });

  it('throws NotFoundException when tenant not found', async () => {
    const service = makeService();
    await expect(service.getTenant('org1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when tenant belongs to a different org', async () => {
    const service = makeService({
      repo: { findById: jest.fn().mockResolvedValue(makeTenant({ organizationId: 'other' })) },
    });
    await expect(service.getTenant('org1', 't1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ── updateTenant ──────────────────────────────────────────────────────────────

describe('TenantsService.updateTenant', () => {
  it('updates and returns the mapped tenant', async () => {
    const updated = makeTenant({ idType: 'national_id', idNumber: 'ID123' });
    const update = jest.fn().mockResolvedValue(updated);

    const service = makeService({
      repo: {
        findById: jest.fn().mockResolvedValue(makeTenant()),
        update,
      },
    });

    const result = await service.updateTenant('org1', 't1', {
      idType: 'national_id',
      idNumber: 'ID123',
    });

    expect(update).toHaveBeenCalledWith('t1', expect.objectContaining({ idType: 'national_id' }));
    expect(result.idNumber).toBe('ID123');
  });

  it('throws NotFoundException when tenant not found', async () => {
    const service = makeService();
    await expect(
      service.updateTenant('org1', 'nope', { idType: 'passport' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ── listTenants ───────────────────────────────────────────────────────────────

describe('TenantsService.listTenants', () => {
  it('returns a list of mapped tenants', async () => {
    const service = makeService({
      repo: { findByOrganization: jest.fn().mockResolvedValue([makeTenant(), makeTenant({ _id: 't2' })]) },
    });

    const result = await service.listTenants('org1', { limit: 50, offset: 0 });
    expect(result.items).toHaveLength(2);
  });

  it('returns empty list when no tenants exist', async () => {
    const service = makeService();
    const result = await service.listTenants('org1', { limit: 50, offset: 0 });
    expect(result.items).toHaveLength(0);
  });
});
