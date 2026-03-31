import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lease, LeaseDocument } from './schemas/lease.schema';
import type { LeaseStatus } from './schemas/lease.schema';
import type { PaymentFrequency } from '../properties/schemas/unit.schema';

@Injectable()
export class LeasesRepository {
  constructor(
    @InjectModel(Lease.name, 'persta')
    private readonly leaseModel: Model<LeaseDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    unitId: string;
    tenantId: string;
    startDate: Date;
    endDate: Date;
    rentAmount: number;
    currency: string;
    paymentFrequency: PaymentFrequency;
    depositAmount?: number;
  }): Promise<LeaseDocument> {
    return this.leaseModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      unitId: new Types.ObjectId(params.unitId),
      tenantId: new Types.ObjectId(params.tenantId),
      startDate: params.startDate,
      endDate: params.endDate,
      rentAmount: params.rentAmount,
      currency: params.currency,
      paymentFrequency: params.paymentFrequency,
      depositAmount: params.depositAmount ?? 0,
    });
  }

  async findById(id: string): Promise<LeaseDocument | null> {
    return this.leaseModel.findById(new Types.ObjectId(id)).exec();
  }

  async findActiveByUnit(unitId: string): Promise<LeaseDocument | null> {
    return this.leaseModel
      .findOne({ unitId: new Types.ObjectId(unitId), status: 'active' })
      .exec();
  }

  async findByTenant(
    tenantId: string,
    pagination: { limit: number; offset: number },
  ): Promise<LeaseDocument[]> {
    return this.leaseModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .exec();
  }

  async findByOrganization(
    organizationId: string,
    filters: { status?: LeaseStatus },
    pagination: { limit: number; offset: number },
  ): Promise<LeaseDocument[]> {
    const query: Record<string, unknown> = { organizationId: new Types.ObjectId(organizationId) };
    if (filters.status) query.status = filters.status;
    return this.leaseModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .exec();
  }

  async findExpiredActive(now: Date): Promise<LeaseDocument[]> {
    return this.leaseModel
      .find({ status: 'active', endDate: { $lte: now } })
      .exec();
  }

  async update(
    id: string,
    patch: Partial<{
      status: LeaseStatus;
      rentAmount: number;
      endDate: Date;
      terminatedAt: Date;
      terminatedReason: string;
    }>,
  ): Promise<LeaseDocument | null> {
    return this.leaseModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: patch }, { new: true })
      .exec();
  }
}
