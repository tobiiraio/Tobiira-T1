import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { UsersRepository } from '../users/users.repository';
import type { MembershipRole } from '../roles/membership-role';
import { MembershipsRepository } from './memberships.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { MembershipInvitesRepository } from './repositories/membership-invites.repository';
import { JoinRequestsRepository } from './repositories/join-requests.repository';

const hashToken = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class MembershipsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly membershipInvitesRepository: MembershipInvitesRepository,
    private readonly joinRequestsRepository: JoinRequestsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async createMembershipDirect(params: {
    organizationId: string;
    userId: string;
    role: MembershipRole;
  }): Promise<{ userId: string; organizationId: string; role: MembershipRole }> {
    const existing = await this.membershipsRepository.findByUserAndOrganization(
      params.userId,
      params.organizationId,
    );
    if (existing) {
      return {
        userId: String(existing.userId),
        organizationId: String(existing.organizationId),
        role: existing.role,
      };
    }
    const membership = await this.membershipsRepository.create(params);
    return {
      userId: String(membership.userId),
      organizationId: String(membership.organizationId),
      role: membership.role,
    };
  }

  async listMembers(params: {
    organizationId: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    items: Array<{ userId: string; email: string; role: MembershipRole; staffRole: string | null; isManagingAgent: boolean }>;
  }> {
    const memberships = await this.membershipsRepository.findByOrganizationId(
      params.organizationId,
      { limit: params.limit ?? 50, offset: params.offset ?? 0 },
    );

    const userIds = memberships.map((m) => String(m.userId));
    const users = await this.usersRepository.findByIds(userIds);
    const emailByUserId = new Map(users.map((u) => [String(u._id), u.email]));

    return {
      items: memberships
        .map((m) => {
          const email = emailByUserId.get(String(m.userId));
          if (!email) return null;
          return {
            userId: String(m.userId),
            email,
            role: m.role,
            staffRole: m.staffRole ?? null,
            isManagingAgent: m.isManagingAgent ?? false,
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    };
  }

  async createInvite(params: {
    organizationId: string;
    invitedEmail: string;
    role: MembershipRole;
    staffRole?: string | null;
    isManagingAgent?: boolean;
    createdByUserId: string;
  }): Promise<{ token: string; expiresAt: string }> {
    const invitedEmail = params.invitedEmail.trim().toLowerCase();

    const inviteTtlDays = Number(
      this.configService.get<string>('INVITE_TTL_DAYS') ?? 7,
    );
    const expiresAt = new Date(
      Date.now() + Math.max(1, inviteTtlDays) * 24 * 60 * 60_000,
    );

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    await this.membershipInvitesRepository.create({
      organizationId: params.organizationId,
      invitedEmail,
      role: params.role,
      staffRole: params.staffRole as any ?? null,
      isManagingAgent: params.isManagingAgent ?? false,
      tokenHash,
      expiresAt,
      createdByUserId: params.createdByUserId,
    });

    return { token, expiresAt: expiresAt.toISOString() };
  }

  async removeMember(params: {
    organizationId: string;
    userId: string;
    requestingUserId: string;
  }): Promise<void> {
    if (params.userId === params.requestingUserId) {
      throw new BadRequestException('Cannot remove yourself from an organization');
    }

    const membership = await this.membershipsRepository.findByUserAndOrganization(
      params.userId,
      params.organizationId,
    );
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.role === 'owner') {
      throw new BadRequestException('Cannot remove an owner. Transfer ownership first');
    }

    await this.membershipsRepository.remove(params.userId, params.organizationId);
  }

  async updateMemberRole(params: {
    organizationId: string;
    userId: string;
    role: MembershipRole;
  }): Promise<{ userId: string; role: MembershipRole }> {
    const membership = await this.membershipsRepository.updateRole(
      params.userId,
      params.organizationId,
      params.role,
    );
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    return { userId: String(membership.userId), role: membership.role };
  }

  async resolveJoinRequestContext(organizationId: string): Promise<{
    ownerEmail: string | null;
    organizationName: string | null;
  }> {
    const [owner, org] = await Promise.all([
      this.membershipsRepository.findOwnerByOrganization(organizationId),
      this.organizationsRepository.findById(organizationId),
    ]);
    const ownerUser = owner ? await this.usersRepository.findById(String(owner.userId)) : null;
    return {
      ownerEmail: ownerUser?.email ?? null,
      organizationName: org?.name ?? null,
    };
  }

  async createJoinRequest(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    message?: string;
  }): Promise<{ id: string; status: string }> {
    const existingMembership = await this.membershipsRepository.findByUserAndOrganization(
      params.userId,
      params.organizationId,
    );
    if (existingMembership) {
      throw new ConflictException('Already a member of this organization');
    }

    const existingRequest = await this.joinRequestsRepository.findPendingByUserAndOrg(
      params.userId,
      params.organizationId,
    );
    if (existingRequest) {
      throw new ConflictException('A pending join request already exists');
    }

    const request = await this.joinRequestsRepository.create(params);
    return { id: String(request._id), status: request.status };
  }

  async listJoinRequests(params: {
    organizationId: string;
    limit: number;
    offset: number;
  }): Promise<{ items: Array<{ id: string; userId: string; userEmail: string; message?: string; createdAt: Date }> }> {
    const requests = await this.joinRequestsRepository.findPendingByOrganization(
      params.organizationId,
      { limit: params.limit, offset: params.offset },
    );
    return {
      items: requests.map((r) => ({
        id: String(r._id),
        userId: String(r.userId),
        userEmail: r.userEmail,
        message: r.message ?? undefined,
        createdAt: (r as any).createdAt,
      })),
    };
  }

  async resolveJoinRequest(params: {
    requestId: string;
    organizationId: string;
    resolvedByUserId: string;
    decision: 'approved' | 'rejected';
  }): Promise<{ id: string; status: string; userEmail: string }> {
    const request = await this.joinRequestsRepository.findById(params.requestId);
    if (!request || String(request.organizationId) !== params.organizationId) {
      throw new NotFoundException('Join request not found');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Join request has already been resolved');
    }

    const resolved = await this.joinRequestsRepository.resolve({
      id: params.requestId,
      status: params.decision,
      resolvedByUserId: params.resolvedByUserId,
    });

    if (params.decision === 'approved') {
      await this.membershipsRepository.create({
        userId: String(request.userId),
        organizationId: String(request.organizationId),
        role: 'occupant',
      });
    }

    return { id: String(resolved!._id), status: resolved!.status, userEmail: resolved!.userEmail };
  }

  async acceptInvite(params: {
    token: string;
    userId: string;
    userEmail: string;
  }): Promise<{ organizationId: string; role: MembershipRole }> {
    const now = new Date();
    const tokenHash = hashToken(params.token.trim());

    const invite = await this.membershipInvitesRepository.findValidByTokenHash(
      tokenHash,
      now,
    );
    if (!invite) {
      throw new UnauthorizedException('Invalid or expired invite');
    }

    const invitedEmail = invite.invitedEmail.trim().toLowerCase();
    if (invitedEmail !== params.userEmail.trim().toLowerCase()) {
      throw new UnauthorizedException('Invite does not match this user');
    }

    await this.membershipInvitesRepository.markAccepted({
      tokenHash,
      acceptedAt: now,
      acceptedByUserId: new Types.ObjectId(params.userId),
    });

    const existing = await this.membershipsRepository.findByUserAndOrganization(
      params.userId,
      String(invite.organizationId),
    );
    if (existing) {
      return {
        organizationId: String(invite.organizationId),
        role: existing.role,
      };
    }

    const membership = await this.membershipsRepository.create({
      userId: params.userId,
      organizationId: String(invite.organizationId),
      role: invite.role,
      staffRole: invite.staffRole ?? null,
      isManagingAgent: invite.isManagingAgent ?? false,
    });

    return {
      organizationId: String(membership.organizationId),
      role: membership.role,
    };
  }
}
