import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Block, BlockDocument } from './schemas/block.schema';

@Injectable()
export class BlocksRepository {
  constructor(
    @InjectModel(Block.name, 'persta')
    private readonly blockModel: Model<BlockDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    propertyId: string;
    name: string;
    description?: string;
  }): Promise<BlockDocument> {
    return this.blockModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      propertyId: new Types.ObjectId(params.propertyId),
      name: params.name,
      description: params.description,
    });
  }

  async findById(id: string): Promise<BlockDocument | null> {
    return this.blockModel.findById(new Types.ObjectId(id)).exec();
  }

  async findByProperty(propertyId: string): Promise<BlockDocument[]> {
    return this.blockModel
      .find({ propertyId: new Types.ObjectId(propertyId) })
      .sort({ name: 1 })
      .exec();
  }

  async update(
    id: string,
    patch: Partial<{ name: string; description: string }>,
  ): Promise<BlockDocument | null> {
    return this.blockModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: patch }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.blockModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }
}
