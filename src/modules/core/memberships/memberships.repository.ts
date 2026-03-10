import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { MembershipRole } from '../roles/membership-role';
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
  }): Promise<MembershipDocument> {
    return this.membershipModel.create({
      userId: new Types.ObjectId(params.userId),
      organizationId: new Types.ObjectId(params.organizationId),
      role: params.role,
    });
  }

  async findByUserId(userId: string): Promise<MembershipDocument[]> {
    return this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }
}
