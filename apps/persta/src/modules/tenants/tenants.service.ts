import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { CoreClientService } from '../../core-client/core-client.service';
import { EventPublisher } from '../../rabbitmq/event-publisher.service';
import { PerstaEvents } from '@tobiira/common';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly coreClient: CoreClientService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async enrollTenant(params: {
    organizationId: string;
    userId: string;
  }) {
    const existing = await this.tenantsRepository.findByUserId(
      params.organizationId,
      params.userId,
    );
    if (existing) {
      throw new ConflictException('User is already enrolled as a tenant in this organization');
    }

    // resolve profile from core — email is the source of truth there
    const profile = await this.coreClient.getUserProfile(params.userId);

    const tenant = await this.tenantsRepository.create({
      organizationId: params.organizationId,
      userId: params.userId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
    });

    // register as occupant in core
    await this.coreClient.createMembership({
      organizationId: params.organizationId,
      userId: params.userId,
      role: 'occupant',
    });

    const orgName = await this.coreClient.getOrganizationName(params.organizationId);

    this.eventPublisher.emit(PerstaEvents.TENANT_ENROLLED, {
      tenantId: String(tenant._id),
      userId: params.userId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      organizationId: params.organizationId,
      organizationName: orgName,
    });

    return this.mapTenant(tenant);
  }

  async getTenant(organizationId: string, tenantId: string) {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant || String(tenant.organizationId) !== organizationId) {
      throw new NotFoundException('Tenant not found');
    }
    return this.mapTenant(tenant);
  }

  async listTenants(
    organizationId: string,
    pagination: { limit: number; offset: number },
  ) {
    const items = await this.tenantsRepository.findByOrganization(organizationId, pagination);
    return { items: items.map((t) => this.mapTenant(t)) };
  }

  async updateTenant(
    organizationId: string,
    tenantId: string,
    patch: Partial<{
      idType: string;
      idNumber: string;
      emergencyContact: { name: string; phone: string };
    }>,
  ) {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant || String(tenant.organizationId) !== organizationId) {
      throw new NotFoundException('Tenant not found');
    }
    const updated = await this.tenantsRepository.update(tenantId, patch);
    return this.mapTenant(updated!);
  }

  private mapTenant(t: any) {
    return {
      id: String(t._id),
      organizationId: String(t.organizationId),
      userId: String(t.userId),
      email: t.email,
      firstName: t.firstName ?? undefined,
      lastName: t.lastName ?? undefined,
      phone: t.phone ?? undefined,
      idType: t.idType ?? undefined,
      idNumber: t.idNumber ?? undefined,
      emergencyContact: t.emergencyContact
        ? { name: t.emergencyContact.name, phone: t.emergencyContact.phone }
        : undefined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
