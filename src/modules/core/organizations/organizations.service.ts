import { Injectable } from '@nestjs/common';
import { MembershipsRepository } from '../memberships/memberships.repository';
import type { MembershipRole } from '../roles/membership-role';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrganization(params: {
    userId: string;
    userEmail: string;
    name: string;
  }): Promise<{ id: string; name: string; role: MembershipRole }> {
    const organization = await this.organizationsRepository.create({
      name: params.name,
      createdByUserId: params.userId,
    });

    const membership = await this.membershipsRepository.create({
      userId: params.userId,
      organizationId: String(organization._id),
      role: 'owner',
    });

    try {
      await this.notificationsService.sendOrganizationCreatedEmail({
        email: params.userEmail,
        organizationName: organization.name,
      });
    } catch {
      // non-blocking
    }

    return {
      id: String(organization._id),
      name: organization.name,
      role: membership.role,
    };
  }

  async listOrganizationsForUser(params: { userId: string }): Promise<{
    items: Array<{
      id: string;
      name: string;
      role: MembershipRole | 'unknown';
    }>;
  }> {
    const memberships = await this.membershipsRepository.findByUserId(
      params.userId,
    );
    const organizationIds = memberships.map((m) => String(m.organizationId));
    const organizations =
      await this.organizationsRepository.findByIds(organizationIds);

    const roleByOrgId = new Map(
      memberships.map((m) => [String(m.organizationId), m.role] as const),
    );

    return {
      items: organizations.map((org) => ({
        id: String(org._id),
        name: org.name,
        role: roleByOrgId.get(String(org._id)) ?? 'unknown',
      })),
    };
  }
}
