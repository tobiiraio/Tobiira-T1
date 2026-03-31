import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { MembershipRole } from '../roles/membership-role';
import type { StaffRole } from '@tobiira/common';
import { Membership, MembershipDocument } from './schemas/membership.schema';

@Injectable()
export class MembershipsRepository {
  constructor(
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,
  ) {}

  async create(params: {
    userId: string;
    organizationId: string;
    role: MembershipRole;
    staffRole?: StaffRole | null;
    isManagingAgent?: boolean;
  }): Promise<MembershipDocument> {
    return this.membershipModel.create({
      userId: new Types.ObjectId(params.userId),
      organizationId: new Types.ObjectId(params.organizationId),
      role: params.role,
      staffRole: params.staffRole ?? null,
      isManagingAgent: params.isManagingAgent ?? false,
    });
  }

  async findByUserId(userId: string): Promise<MembershipDocument[]> {
    return this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByOrganizationId(
    organizationId: string,
    pagination?: { limit: number; offset: number },
  ): Promise<MembershipDocument[]> {
    return this.membershipModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .skip(pagination?.offset ?? 0)
      .limit(pagination?.limit ?? 50)
      .exec();
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<MembershipDocument | null> {
    return this.membershipModel
      .findOne({
        userId: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
  }

  async remove(userId: string, organizationId: string): Promise<boolean> {
    const result = await this.membershipModel
      .deleteOne({
        userId: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();
    return result.deletedCount === 1;
  }

  async findOwnerByOrganization(organizationId: string): Promise<MembershipDocument | null> {
    return this.membershipModel
      .findOne({ organizationId: new Types.ObjectId(organizationId), role: 'owner' })
      .exec();
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    return this.membershipModel
      .countDocuments({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
  }

  async updateRole(
    userId: string,
    organizationId: string,
    role: MembershipRole,
  ): Promise<MembershipDocument | null> {
    return this.membershipModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: { role } },
        { new: true },
      )
      .exec();
  }
}
