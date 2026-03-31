import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { MembershipsService } from './memberships.service';
import type { MembershipsRepository } from './memberships.repository';
import type { MembershipInvitesRepository } from './repositories/membership-invites.repository';
import type { JoinRequestsRepository } from './repositories/join-requests.repository';
import type { UsersRepository } from '../users/users.repository';
import type { OrganizationsRepository } from '../organizations/organizations.repository';

const makeConfig = (overrides: Record<string, string> = {}): ConfigService =>
  ({ get: (k: string) => overrides[k] }) as unknown as ConfigService;

const makeMembershipsRepo = (overrides: Partial<MembershipsRepository> = {}): MembershipsRepository =>
  ({
    findByUserAndOrganization: jest.fn().mockResolvedValue(null),
    findByOrganizationId: jest.fn().mockResolvedValue([]),
    findOwnerByOrganization: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    remove: jest.fn(),
    updateRole: jest.fn(),
    ...overrides,
  }) as unknown as MembershipsRepository;

const makeInvitesRepo = (overrides: Partial<MembershipInvitesRepository> = {}): MembershipInvitesRepository =>
  ({
    create: jest.fn(),
    findValidByTokenHash: jest.fn().mockResolvedValue(null),
    markAccepted: jest.fn(),
    ...overrides,
  }) as unknown as MembershipInvitesRepository;

const makeJoinRequestsRepo = (overrides: Partial<JoinRequestsRepository> = {}): JoinRequestsRepository =>
  ({
    create: jest.fn(),
    findPendingByUserAndOrg: jest.fn().mockResolvedValue(null),
    findPendingByOrganization: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    resolve: jest.fn(),
    ...overrides,
  }) as unknown as JoinRequestsRepository;

const makeUsersRepo = (overrides: Partial<UsersRepository> = {}): UsersRepository =>
  ({
    findById: jest.fn().mockResolvedValue(null),
    findByIds: jest.fn().mockResolvedValue([]),
    ...overrides,
  }) as unknown as UsersRepository;

const makeOrgsRepo = (overrides: Partial<OrganizationsRepository> = {}): OrganizationsRepository =>
  ({
    findById: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as OrganizationsRepository;

const makeService = (overrides: {
  config?: ConfigService;
  memberships?: Partial<MembershipsRepository>;
  invites?: Partial<MembershipInvitesRepository>;
  joinRequests?: Partial<JoinRequestsRepository>;
  users?: Partial<UsersRepository>;
  orgs?: Partial<OrganizationsRepository>;
} = {}) =>
  new MembershipsService(
    overrides.config ?? makeConfig(),
    makeMembershipsRepo(overrides.memberships),
    makeInvitesRepo(overrides.invites),
    makeJoinRequestsRepo(overrides.joinRequests),
    makeUsersRepo(overrides.users),
    makeOrgsRepo(overrides.orgs),
  );

// ── createInvite ─────────────────────────────────────────────────────────────

describe('MembershipsService.createInvite', () => {
  it('creates an invite and returns a token and expiry', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const service = makeService({
      config: makeConfig({ INVITE_TTL_DAYS: '7' }),
      invites: { create },
    });

    const result = await service.createInvite({
      organizationId: 'org1',
      invitedEmail: 'User@Example.com',
      role: 'operator',
      createdByUserId: 'u1',
    });

    expect(result.token).toHaveLength(64); // 32 random bytes → 64 hex chars
    expect(new Date(result.expiresAt) > new Date()).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org1',
        invitedEmail: 'user@example.com', // lowercased
        role: 'operator',
        isManagingAgent: false,
      }),
    );
  });
});

// ── createJoinRequest ─────────────────────────────────────────────────────────

describe('MembershipsService.createJoinRequest', () => {
  it('creates a join request when no membership and no pending request exist', async () => {
    const create = jest.fn().mockResolvedValue({ _id: 'jr1', status: 'pending' });
    const service = makeService({ joinRequests: { create } });

    const result = await service.createJoinRequest({
      organizationId: 'org1',
      userId: 'u1',
      userEmail: 'u1@example.com',
    });

    expect(result).toEqual({ id: 'jr1', status: 'pending' });
  });

  it('throws ConflictException when already a member', async () => {
    const service = makeService({
      memberships: {
        findByUserAndOrganization: jest.fn().mockResolvedValue({ role: 'operator' }),
      },
    });

    await expect(
      service.createJoinRequest({ organizationId: 'org1', userId: 'u1', userEmail: 'u@b.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when a pending request already exists', async () => {
    const service = makeService({
      joinRequests: {
        findPendingByUserAndOrg: jest.fn().mockResolvedValue({ _id: 'jr0', status: 'pending' }),
      },
    });

    await expect(
      service.createJoinRequest({ organizationId: 'org1', userId: 'u1', userEmail: 'u@b.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

// ── removeMember ──────────────────────────────────────────────────────────────

describe('MembershipsService.removeMember', () => {
  it('throws BadRequestException when removing self', async () => {
    const service = makeService();

    await expect(
      service.removeMember({ organizationId: 'org1', userId: 'u1', requestingUserId: 'u1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when membership does not exist', async () => {
    const service = makeService();

    await expect(
      service.removeMember({ organizationId: 'org1', userId: 'u2', requestingUserId: 'u1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when removing an owner', async () => {
    const service = makeService({
      memberships: {
        findByUserAndOrganization: jest.fn().mockResolvedValue({ role: 'owner' }),
      },
    });

    await expect(
      service.removeMember({ organizationId: 'org1', userId: 'u2', requestingUserId: 'u1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes a non-owner member', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const service = makeService({
      memberships: {
        findByUserAndOrganization: jest.fn().mockResolvedValue({ role: 'operator' }),
        remove,
      },
    });

    await service.removeMember({ organizationId: 'org1', userId: 'u2', requestingUserId: 'u1' });
    expect(remove).toHaveBeenCalledWith('u2', 'org1');
  });
});

// ── acceptInvite ──────────────────────────────────────────────────────────────

describe('MembershipsService.acceptInvite', () => {
  it('throws UnauthorizedException for invalid token', async () => {
    const service = makeService();

    await expect(
      service.acceptInvite({ token: 'bad-token', userId: 'u1', userEmail: 'u@b.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when email does not match invite', async () => {
    const service = makeService({
      invites: {
        findValidByTokenHash: jest.fn().mockResolvedValue({
          invitedEmail: 'other@example.com',
          organizationId: 'org1',
          role: 'operator',
        }),
      },
    });

    await expect(
      service.acceptInvite({ token: 'sometoken', userId: 'u1', userEmail: 'wrong@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates membership on valid invite acceptance', async () => {
    const create = jest.fn().mockResolvedValue({ organizationId: 'org1', role: 'operator' });
    const service = makeService({
      invites: {
        findValidByTokenHash: jest.fn().mockResolvedValue({
          invitedEmail: 'u@example.com',
          organizationId: 'org1',
          role: 'operator',
          isManagingAgent: false,
          staffRole: null,
        }),
        markAccepted: jest.fn().mockResolvedValue(undefined),
      },
      memberships: {
        findByUserAndOrganization: jest.fn().mockResolvedValue(null),
        create,
      },
    });

    const result = await service.acceptInvite({
      token: 'validtoken',
      userId: 'u1',
      userEmail: 'u@example.com',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'operator', organizationId: 'org1' }),
    );
    expect(result.role).toBe('operator');
  });
});

// ── resolveJoinRequestContext ─────────────────────────────────────────────────

describe('MembershipsService.resolveJoinRequestContext', () => {
  it('returns owner email and org name', async () => {
    const service = makeService({
      memberships: {
        findOwnerByOrganization: jest.fn().mockResolvedValue({ userId: 'u1' }),
      },
      users: {
        findById: jest.fn().mockResolvedValue({ _id: 'u1', email: 'owner@example.com' }),
      },
      orgs: {
        findById: jest.fn().mockResolvedValue({ _id: 'org1', name: 'Acme' }),
      },
    });

    const result = await service.resolveJoinRequestContext('org1');
    expect(result).toEqual({ ownerEmail: 'owner@example.com', organizationName: 'Acme' });
  });

  it('returns nulls when org or owner not found', async () => {
    const service = makeService();
    const result = await service.resolveJoinRequestContext('org1');
    expect(result).toEqual({ ownerEmail: null, organizationName: null });
  });
});
