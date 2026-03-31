import { Injectable } from '@nestjs/common';
import { CoreEvents } from '@tobiira/common';
import { MembershipsRepository } from '../memberships/memberships.repository';
import type { MembershipRole } from '../roles/membership-role';
import { EventPublisher } from '../../../rabbitmq/event-publisher.service';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createOrganization(params: {
    userId: string;
    userEmail: string;
    name: string;
    address?: string;
    location?: { lat: number; lng: number };
  }): Promise<{
    id: string;
    name: string;
    address?: string;
    location?: { lat: number; lng: number };
    role: MembershipRole;
  }> {
    const organization = await this.organizationsRepository.create({
      name: params.name,
      address: params.address,
      location: params.location,
      createdByUserId: params.userId,
    });

    const membership = await this.membershipsRepository.create({
      userId: params.userId,
      organizationId: String(organization._id),
      role: 'owner',
    });

    this.eventPublisher.emit(CoreEvents.ORG_CREATED, {
      organizationId: String(organization._id),
      organizationName: organization.name,
      ownerEmail: params.userEmail,
    });

    return {
      id: String(organization._id),
      name: organization.name,
      address: organization.address ?? undefined,
      location: organization.location
        ? { lat: organization.location.lat, lng: organization.location.lng }
        : undefined,
      plan: { featureFlags: organization.plan?.featureFlags ?? [], billingRef: organization.plan?.billingRef ?? null },
      role: membership.role,
    };
  }

  async getOrganizationById(organizationId: string): Promise<{
    id: string;
    name: string;
    plan: { featureFlags: string[]; billingRef: string | null };
  } | null> {
    const org = await this.organizationsRepository.findById(organizationId);
    if (!org) return null;
    return {
      id: String(org._id),
      name: org.name,
      plan: { featureFlags: org.plan?.featureFlags ?? [], billingRef: org.plan?.billingRef ?? null },
    };
  }

  async updatePlan(
    organizationId: string,
    patch: { featureFlags?: string[]; billingRef?: string | null },
  ): Promise<{ featureFlags: string[]; billingRef: string | null }> {
    const org = await this.organizationsRepository.updatePlan(organizationId, patch);
    return { featureFlags: org.plan?.featureFlags ?? [], billingRef: org.plan?.billingRef ?? null };
  }

  async getSettings(
    organizationId: string,
  ): Promise<{ timezone: string; currency: string; locale: string }> {
    const s = await this.organizationsRepository.getSettings(organizationId);
    return { timezone: s.timezone, currency: s.currency, locale: s.locale };
  }

  async updateSettings(
    organizationId: string,
    patch: { timezone?: string; currency?: string; locale?: string },
  ): Promise<{ timezone: string; currency: string; locale: string }> {
    const s = await this.organizationsRepository.updateSettings(organizationId, patch);
    return { timezone: s.timezone, currency: s.currency, locale: s.locale };
  }

  async listOrganizationsForUser(params: {
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      address?: string;
      location?: { lat: number; lng: number };
      role: MembershipRole | 'unknown';
    }>;
  }> {
    const memberships = await this.membershipsRepository.findByUserId(
      params.userId,
    );
    const organizationIds = memberships.map((m) => String(m.organizationId));
    const organizations = await this.organizationsRepository.findByIds(
      organizationIds,
      { limit: params.limit ?? 50, offset: params.offset ?? 0 },
    );

    const roleByOrgId = new Map(
      memberships.map((m) => [String(m.organizationId), m.role] as const),
    );

    return {
      items: organizations.map((org) => ({
        id: String(org._id),
        name: org.name,
        address: org.address ?? undefined,
        location: org.location
          ? { lat: org.location.lat, lng: org.location.lng }
          : undefined,
        plan: { featureFlags: org.plan?.featureFlags ?? [], billingRef: org.plan?.billingRef ?? null },
        role: roleByOrgId.get(String(org._id)) ?? 'unknown',
      })),
    };
  }
}
