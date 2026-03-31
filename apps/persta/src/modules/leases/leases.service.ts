import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { LeasesRepository } from './leases.repository';
import { UnitsRepository } from '../properties/units.repository';
import { PropertiesRepository } from '../properties/properties.repository';
import { TenantsRepository } from '../tenants/tenants.repository';
import { EventPublisher } from '../../rabbitmq/event-publisher.service';
import { CoreClientService } from '../../core-client/core-client.service';
import { PerstaEvents } from '@tobiira/common';
import type { LeaseStatus } from './schemas/lease.schema';
import type { PaymentFrequency } from '../properties/schemas/unit.schema';

@Injectable()
export class LeasesService {
  constructor(
    private readonly leasesRepository: LeasesRepository,
    private readonly unitsRepository: UnitsRepository,
    private readonly propertiesRepository: PropertiesRepository,
    private readonly tenantsRepository: TenantsRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly coreClient: CoreClientService,
  ) {}

  async createLease(params: {
    organizationId: string;
    unitId: string;
    tenantId: string;
    startDate: Date;
    endDate: Date;
    rentAmount?: number; // optional override — defaults to unit's listed price
    depositAmount?: number;
  }) {
    const unit = await this.unitsRepository.findById(params.unitId);
    if (!unit || String(unit.organizationId) !== params.organizationId) {
      throw new NotFoundException('Unit not found');
    }
    if (unit.status === 'occupied') {
      throw new ConflictException('Unit is already occupied');
    }

    const tenant = await this.tenantsRepository.findById(params.tenantId);
    if (!tenant || String(tenant.organizationId) !== params.organizationId) {
      throw new NotFoundException('Tenant not found');
    }

    if (params.startDate >= params.endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const lease = await this.leasesRepository.create({
      organizationId: params.organizationId,
      unitId: params.unitId,
      tenantId: params.tenantId,
      startDate: params.startDate,
      endDate: params.endDate,
      rentAmount: params.rentAmount ?? unit.rentAmount,
      currency: unit.currency,
      paymentFrequency: unit.paymentFrequency,
      depositAmount: params.depositAmount,
    });

    // mark unit as occupied
    await this.unitsRepository.update(params.unitId, { status: 'occupied' });

    const ctx = await this.resolveLeaseContext(
      params.organizationId,
      String(lease.unitId),
      String(lease.tenantId),
    );

    this.eventPublisher.emit(PerstaEvents.LEASE_CREATED, {
      leaseId: String(lease._id),
      tenantEmail: ctx.tenantEmail,
      unitName: ctx.unitName,
      propertyName: ctx.propertyName,
      organizationName: ctx.orgName,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      rentAmount: lease.rentAmount,
      currency: lease.currency,
      paymentFrequency: lease.paymentFrequency,
    });

    return this.mapLease(lease);
  }

  async activateLease(organizationId: string, leaseId: string) {
    const lease = await this.assertLeaseOwnership(organizationId, leaseId);
    if (lease.status !== 'pending') {
      throw new BadRequestException('Only pending leases can be activated');
    }
    const updated = await this.leasesRepository.update(leaseId, { status: 'active' });

    const ctx = await this.resolveLeaseContext(
      organizationId,
      String(lease.unitId),
      String(lease.tenantId),
    );

    this.eventPublisher.emit(PerstaEvents.LEASE_ACTIVATED, {
      leaseId,
      tenantEmail: ctx.tenantEmail,
      unitName: ctx.unitName,
      propertyName: ctx.propertyName,
      organizationName: ctx.orgName,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      rentAmount: lease.rentAmount,
      currency: lease.currency,
    });

    return this.mapLease(updated!);
  }

  async terminateLease(
    organizationId: string,
    leaseId: string,
    reason?: string,
  ) {
    const lease = await this.assertLeaseOwnership(organizationId, leaseId);
    if (lease.status === 'terminated' || lease.status === 'expired') {
      throw new BadRequestException('Lease is already closed');
    }
    const terminatedAt = new Date();
    const updated = await this.leasesRepository.update(leaseId, {
      status: 'terminated',
      terminatedAt,
      terminatedReason: reason,
    });

    // free up the unit
    await this.unitsRepository.update(String(lease.unitId), { status: 'vacant' });

    const ctx = await this.resolveLeaseContext(
      organizationId,
      String(lease.unitId),
      String(lease.tenantId),
    );

    this.eventPublisher.emit(PerstaEvents.LEASE_TERMINATED, {
      leaseId,
      tenantEmail: ctx.tenantEmail,
      unitName: ctx.unitName,
      propertyName: ctx.propertyName,
      organizationName: ctx.orgName,
      terminatedAt: terminatedAt.toISOString(),
      reason,
    });

    return this.mapLease(updated!);
  }

  async renewLease(
    organizationId: string,
    leaseId: string,
    params: { newEndDate: Date; rentAmount?: number },
  ) {
    const lease = await this.assertLeaseOwnership(organizationId, leaseId);
    if (lease.status === 'terminated') {
      throw new BadRequestException('Cannot renew a terminated lease');
    }
    if (params.newEndDate <= lease.endDate) {
      throw new BadRequestException('newEndDate must be after the current end date');
    }

    const patch: Parameters<typeof this.leasesRepository.update>[1] = {
      endDate: params.newEndDate,
      // reset expired status back to active on renewal
      status: lease.status === 'expired' ? 'active' : lease.status,
    };
    if (params.rentAmount !== undefined) patch.rentAmount = params.rentAmount;

    const updated = await this.leasesRepository.update(leaseId, patch);

    // if the lease was expired and unit had been freed, re-occupy it
    if (lease.status === 'expired') {
      await this.unitsRepository.update(String(lease.unitId), { status: 'occupied' });
    }

    const ctx = await this.resolveLeaseContext(
      organizationId,
      String(lease.unitId),
      String(lease.tenantId),
    );

    this.eventPublisher.emit(PerstaEvents.LEASE_RENEWED, {
      leaseId,
      tenantEmail: ctx.tenantEmail,
      unitName: ctx.unitName,
      propertyName: ctx.propertyName,
      organizationName: ctx.orgName,
      newEndDate: params.newEndDate.toISOString(),
      rentAmount: updated!.rentAmount,
      currency: updated!.currency,
    });

    return this.mapLease(updated!);
  }

  async getLease(organizationId: string, leaseId: string) {
    const lease = await this.assertLeaseOwnership(organizationId, leaseId);
    return this.mapLease(lease);
  }

  // Returns a fully-hydrated lease record for internal service-to-service use (e.g., documents service)
  async getLeaseInternal(leaseId: string) {
    const lease = await this.leasesRepository.findById(leaseId);
    if (!lease) throw new NotFoundException('Lease not found');

    const ctx = await this.resolveLeaseContext(
      String(lease.organizationId),
      String(lease.unitId),
      String(lease.tenantId),
    );

    return {
      ...this.mapLease(lease),
      tenantEmail: ctx.tenantEmail,
      tenantName: ctx.tenantName,
      unitName: ctx.unitName,
      propertyName: ctx.propertyName,
      organizationName: ctx.orgName,
    };
  }

  async listLeases(
    organizationId: string,
    filters: { status?: LeaseStatus },
    pagination: { limit: number; offset: number },
  ) {
    const items = await this.leasesRepository.findByOrganization(organizationId, filters, pagination);
    return { items: items.map((l) => this.mapLease(l)) };
  }

  async listLeasesByTenant(
    organizationId: string,
    tenantId: string,
    pagination: { limit: number; offset: number },
  ) {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant || String(tenant.organizationId) !== organizationId) {
      throw new NotFoundException('Tenant not found');
    }
    const items = await this.leasesRepository.findByTenant(tenantId, pagination);
    return { items: items.map((l) => this.mapLease(l)) };
  }

  private async resolveLeaseContext(
    organizationId: string,
    unitId: string,
    tenantId: string,
  ): Promise<{ tenantEmail: string; tenantName?: string; unitName: string; propertyName: string; orgName: string }> {
    const [unit, tenant, orgName] = await Promise.all([
      this.unitsRepository.findById(unitId),
      this.tenantsRepository.findById(tenantId),
      this.coreClient.getOrganizationName(organizationId),
    ]);

    const property = unit?.propertyId
      ? await this.propertiesRepository.findById(String(unit.propertyId))
      : null;

    const nameParts = [tenant?.firstName, tenant?.lastName].filter(Boolean);
    return {
      tenantEmail: tenant?.email ?? '',
      tenantName: nameParts.length ? nameParts.join(' ') : undefined,
      unitName: unit?.name ?? '',
      propertyName: property?.name ?? '',
      orgName,
    };
  }

  private async assertLeaseOwnership(organizationId: string, leaseId: string) {
    const lease = await this.leasesRepository.findById(leaseId);
    if (!lease || String(lease.organizationId) !== organizationId) {
      throw new NotFoundException('Lease not found');
    }
    return lease;
  }

  private mapLease(l: any) {
    return {
      id: String(l._id),
      organizationId: String(l.organizationId),
      unitId: String(l.unitId),
      tenantId: String(l.tenantId),
      startDate: l.startDate,
      endDate: l.endDate,
      rentAmount: l.rentAmount,
      currency: l.currency,
      paymentFrequency: l.paymentFrequency,
      depositAmount: l.depositAmount,
      status: l.status,
      terminatedAt: l.terminatedAt ?? undefined,
      terminatedReason: l.terminatedReason ?? undefined,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  }
}
