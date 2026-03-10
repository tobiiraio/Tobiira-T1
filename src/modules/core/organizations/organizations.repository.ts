import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';

@Injectable()
export class OrganizationsRepository {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {}

  async create(params: {
    name: string;
    createdByUserId: string;
  }): Promise<OrganizationDocument> {
    return this.organizationModel.create({
      name: params.name,
      createdByUserId: new Types.ObjectId(params.createdByUserId),
    });
  }

  async findByIds(ids: readonly string[]): Promise<OrganizationDocument[]> {
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    return this.organizationModel
      .find({ _id: { $in: objectIds } })
      .sort({ createdAt: -1 })
      .exec();
  }
}
