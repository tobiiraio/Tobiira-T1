import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JoinRequest, JoinRequestDocument } from '../schemas/join-request.schema';

@Injectable()
export class JoinRequestsRepository {
  constructor(
    @InjectModel(JoinRequest.name)
    private readonly model: Model<JoinRequestDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    message?: string;
  }): Promise<JoinRequestDocument> {
    return this.model.create({
      organizationId: new Types.ObjectId(params.organizationId),
      userId: new Types.ObjectId(params.userId),
      userEmail: params.userEmail,
      message: params.message,
    });
  }

  async findPendingByOrganization(
    organizationId: string,
    pagination: { limit: number; offset: number },
  ): Promise<JoinRequestDocument[]> {
    return this.model
      .find({ organizationId: new Types.ObjectId(organizationId), status: 'pending' })
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .exec();
  }

  async findById(id: string): Promise<JoinRequestDocument | null> {
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  async findPendingByUserAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<JoinRequestDocument | null> {
    return this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
        status: 'pending',
      })
      .exec();
  }

  async resolve(params: {
    id: string;
    status: 'approved' | 'rejected';
    resolvedByUserId: string;
  }): Promise<JoinRequestDocument | null> {
    return this.model
      .findByIdAndUpdate(
        new Types.ObjectId(params.id),
        {
          $set: {
            status: params.status,
            resolvedByUserId: new Types.ObjectId(params.resolvedByUserId),
            resolvedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();
  }
}
