import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Property, PropertyDocument } from './schemas/property.schema';
import type { PropertyType } from './schemas/property.schema';

@Injectable()
export class PropertiesRepository {
  constructor(
    @InjectModel(Property.name, 'persta')
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    name: string;
    address?: string;
    location?: { lat: number; lng: number };
    type: PropertyType;
    createdByUserId: string;
  }): Promise<PropertyDocument> {
    return this.propertyModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      name: params.name,
      address: params.address,
      location: params.location,
      type: params.type,
      createdByUserId: new Types.ObjectId(params.createdByUserId),
    });
  }

  async findById(id: string): Promise<PropertyDocument | null> {
    return this.propertyModel.findById(new Types.ObjectId(id)).exec();
  }

  async findByOrganization(
    organizationId: string,
    pagination: { limit: number; offset: number },
  ): Promise<PropertyDocument[]> {
    return this.propertyModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .exec();
  }

  async update(
    id: string,
    patch: Partial<{ name: string; address: string; location: { lat: number; lng: number }; type: PropertyType }>,
  ): Promise<PropertyDocument | null> {
    return this.propertyModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: patch }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.propertyModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }
}
