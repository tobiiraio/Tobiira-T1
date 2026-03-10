import type { NotificationsService } from '../notifications/notifications.service';
import type { MembershipsRepository } from '../memberships/memberships.repository';
import { OrganizationsService } from './organizations.service';
import type { OrganizationsRepository } from './organizations.repository';

describe('OrganizationsService', () => {
  it('creates organization, creates owner membership, and sends email', async () => {
    const organizationsRepository = {
      create: jest.fn().mockResolvedValue({ _id: 'o1', name: 'Acme' }),
      findByIds: jest.fn(),
    } as unknown as OrganizationsRepository;

    const membershipsRepository = {
      create: jest.fn().mockResolvedValue({ role: 'owner', organizationId: 'o1' }),
      findByUserId: jest.fn(),
    } as unknown as MembershipsRepository;

    const notificationsService = {
      sendOrganizationCreatedEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const service = new OrganizationsService(
      organizationsRepository,
      membershipsRepository,
      notificationsService,
    );

    const result = await service.createOrganization({
      userId: 'u1',
      userEmail: 'u1@example.com',
      name: 'Acme',
    });

    expect(organizationsRepository.create).toHaveBeenCalledWith({
      name: 'Acme',
      createdByUserId: 'u1',
    });
    expect(membershipsRepository.create).toHaveBeenCalledWith({
      userId: 'u1',
      organizationId: 'o1',
      role: 'owner',
    });
    expect(notificationsService.sendOrganizationCreatedEmail).toHaveBeenCalledWith({
      email: 'u1@example.com',
      organizationName: 'Acme',
    });
    expect(result).toEqual({ id: 'o1', name: 'Acme', role: 'owner' });
  });
});

