import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import {
  OrganizationSettings,
  OrganizationSettingsDocument,
} from './schemas/organization-settings.schema';

@Injectable()
export class OrganizationsRepository {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationSettings.name)
    private readonly settingsModel: Model<OrganizationSettingsDocument>,
  ) {}

  async create(params: {
    name: string;
    address?: string;
    location?: { lat: number; lng: number };
    createdByUserId: string;
  }): Promise<OrganizationDocument> {
    return this.organizationModel.create({
      name: params.name,
      address: params.address,
      location: params.location,
      createdByUserId: new Types.ObjectId(params.createdByUserId),
    });
  }

  async findById(id: string): Promise<OrganizationDocument | null> {
    return this.organizationModel.findById(new Types.ObjectId(id)).exec();
  }

  async getSettings(
    organizationId: string,
  ): Promise<OrganizationSettingsDocument> {
    const existing = await this.settingsModel
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
    if (existing) return existing;
    // auto-create with defaults on first access
    return this.settingsModel.create({
      organizationId: new Types.ObjectId(organizationId),
    });
  }

  async updateSettings(
    organizationId: string,
    patch: { timezone?: string; currency?: string; locale?: string },
  ): Promise<OrganizationSettingsDocument> {
    return this.settingsModel
      .findOneAndUpdate(
        { organizationId: new Types.ObjectId(organizationId) },
        { $set: patch },
        { new: true, upsert: true },
      )
      .exec();
  }

  async updatePlan(
    organizationId: string,
    patch: { featureFlags?: string[]; billingRef?: string | null },
  ): Promise<OrganizationDocument> {
    const update: Record<string, unknown> = {};
    if (patch.featureFlags !== undefined) update['plan.featureFlags'] = patch.featureFlags;
    if (patch.billingRef !== undefined) update['plan.billingRef'] = patch.billingRef;

    const org = await this.organizationModel
      .findByIdAndUpdate(
        new Types.ObjectId(organizationId),
        { $set: update },
        { new: true },
      )
      .exec();
    if (!org) throw new Error(`Organization ${organizationId} not found`);
    return org;
  }

  async findByIds(
    ids: readonly string[],
    pagination?: { limit: number; offset: number },
  ): Promise<OrganizationDocument[]> {
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    return this.organizationModel
      .find({ _id: { $in: objectIds } })
      .sort({ createdAt: -1 })
      .skip(pagination?.offset ?? 0)
      .limit(pagination?.limit ?? 50)
      .exec();
  }
}
