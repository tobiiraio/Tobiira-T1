import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Amenity, AmenityDocument } from './schemas/amenity.schema';
import type { AmenityLevel, AmenityStatus } from './schemas/amenity.schema';

@Injectable()
export class AmenitiesRepository {
  constructor(
    @InjectModel(Amenity.name, 'persta')
    private readonly amenityModel: Model<AmenityDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    level: AmenityLevel;
    ownerId: string;
    name: string;
    description?: string;
    type?: string;
    capacity?: number;
  }): Promise<AmenityDocument> {
    return this.amenityModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      level: params.level,
      ownerId: new Types.ObjectId(params.ownerId),
      name: params.name,
      description: params.description,
      type: params.type,
      capacity: params.capacity,
    });
  }

  async findByOwner(ownerId: string, level: AmenityLevel): Promise<AmenityDocument[]> {
    return this.amenityModel
      .find({ ownerId: new Types.ObjectId(ownerId), level })
      .sort({ name: 1 })
      .exec();
  }

  async findById(id: string): Promise<AmenityDocument | null> {
    return this.amenityModel.findById(new Types.ObjectId(id)).exec();
  }

  async update(
    id: string,
    patch: Partial<{ name: string; description: string; type: string; capacity: number; status: AmenityStatus }>,
  ): Promise<AmenityDocument | null> {
    return this.amenityModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: patch }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.amenityModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }
}
