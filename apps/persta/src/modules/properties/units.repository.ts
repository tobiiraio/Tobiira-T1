import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Unit, UnitDocument } from './schemas/unit.schema';
import type { UnitStatus, PaymentFrequency } from './schemas/unit.schema';

@Injectable()
export class UnitsRepository {
  constructor(
    @InjectModel(Unit.name, 'persta')
    private readonly unitModel: Model<UnitDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    propertyId: string;
    blockId?: string | null;
    name: string;
    description?: string;
    rentAmount: number;
    currency: string;
    paymentFrequency: PaymentFrequency;
    floorNumber?: number;
    sizeSqm?: number;
  }): Promise<UnitDocument> {
    return this.unitModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      propertyId: new Types.ObjectId(params.propertyId),
      blockId: params.blockId ? new Types.ObjectId(params.blockId) : null,
      name: params.name,
      description: params.description,
      rentAmount: params.rentAmount,
      currency: params.currency,
      paymentFrequency: params.paymentFrequency,
      floorNumber: params.floorNumber,
      sizeSqm: params.sizeSqm,
    });
  }

  async findById(id: string): Promise<UnitDocument | null> {
    return this.unitModel.findById(new Types.ObjectId(id)).exec();
  }

  async findByProperty(
    propertyId: string,
    pagination: { limit: number; offset: number },
  ): Promise<UnitDocument[]> {
    return this.unitModel
      .find({ propertyId: new Types.ObjectId(propertyId) })
      .sort({ name: 1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .exec();
  }

  async findByBlock(blockId: string): Promise<UnitDocument[]> {
    return this.unitModel
      .find({ blockId: new Types.ObjectId(blockId) })
      .sort({ name: 1 })
      .exec();
  }

  async update(
    id: string,
    patch: Partial<{
      name: string;
      description: string;
      rentAmount: number;
      currency: string;
      paymentFrequency: PaymentFrequency;
      status: UnitStatus;
      floorNumber: number;
      sizeSqm: number;
    }>,
  ): Promise<UnitDocument | null> {
    return this.unitModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: patch }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.unitModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }
}
