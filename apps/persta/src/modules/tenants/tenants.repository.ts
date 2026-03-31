import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from './schemas/tenant.schema';

@Injectable()
export class TenantsRepository {
  constructor(
    @InjectModel(Tenant.name, 'persta')
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<TenantDocument> {
    return this.tenantModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      userId: new Types.ObjectId(params.userId),
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
    });
  }

  async findById(id: string): Promise<TenantDocument | null> {
    return this.tenantModel.findById(new Types.ObjectId(id)).exec();
  }

  async findByUserId(organizationId: string, userId: string): Promise<TenantDocument | null> {
    return this.tenantModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  async findByOrganization(
    organizationId: string,
    pagination: { limit: number; offset: number },
  ): Promise<TenantDocument[]> {
    return this.tenantModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .exec();
  }

  async update(
    id: string,
    patch: Partial<{ firstName: string; lastName: string; phone: string; idType: string; idNumber: string; emergencyContact: { name: string; phone: string } }>,
  ): Promise<TenantDocument | null> {
    return this.tenantModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: patch }, { new: true })
      .exec();
  }
}
