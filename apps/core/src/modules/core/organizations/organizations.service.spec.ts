import type { MembershipsRepository } from '../memberships/memberships.repository';
import type { EventPublisher } from '../../../rabbitmq/event-publisher.service';
import { OrganizationsService } from './organizations.service';
import type { OrganizationsRepository } from './organizations.repository';

describe('OrganizationsService', () => {
  it('creates organization, creates owner membership, and emits event', async () => {
    const createOrganization = jest
      .fn()
      .mockResolvedValue({ _id: 'o1', name: 'Acme', address: 'Kampala', plan: { featureFlags: [], billingRef: null } });
    const createMembership = jest
      .fn()
      .mockResolvedValue({ role: 'owner', organizationId: 'o1' });
    const emit = jest.fn();

    const organizationsRepository = {
      create: createOrganization,
      findByIds: jest.fn(),
    } as unknown as OrganizationsRepository;

    const membershipsRepository = {
      create: createMembership,
      findByUserId: jest.fn(),
    } as unknown as MembershipsRepository;

    const eventPublisher = { emit } as unknown as EventPublisher;

    const service = new OrganizationsService(
      organizationsRepository,
      membershipsRepository,
      eventPublisher,
    );

    const result = await service.createOrganization({
      userId: 'u1',
      userEmail: 'u1@example.com',
      name: 'Acme',
      address: 'Kampala',
    });

    expect(createOrganization).toHaveBeenCalledWith({
      name: 'Acme',
      address: 'Kampala',
      location: undefined,
      createdByUserId: 'u1',
    });
    expect(createMembership).toHaveBeenCalledWith({
      userId: 'u1',
      organizationId: 'o1',
      role: 'owner',
    });
    expect(emit).toHaveBeenCalledWith('core.org.created', {
      organizationId: 'o1',
      organizationName: 'Acme',
      ownerEmail: 'u1@example.com',
    });
    expect(result).toEqual({
      id: 'o1',
      name: 'Acme',
      address: 'Kampala',
      location: undefined,
      plan: { featureFlags: [], billingRef: null },
      role: 'owner',
    });
  });
});
