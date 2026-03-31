import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device, DeviceDocument } from './schemas/device.schema';

@Injectable()
export class DevicesRepository {
  constructor(
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    name: string;
    hardwareId?: string;
    keyHash: string;
  }): Promise<DeviceDocument> {
    return this.deviceModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      name: params.name,
      hardwareId: params.hardwareId,
      keyHash: params.keyHash,
      isActive: true,
      lastSeenAt: null,
      revokedAt: null,
    });
  }

  async findByKeyHash(keyHash: string): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findOne({ keyHash, isActive: true, revokedAt: null })
      .exec();
  }

  async findByOrganizationId(
    organizationId: string,
    pagination?: { limit: number; offset: number },
  ): Promise<DeviceDocument[]> {
    return this.deviceModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .skip(pagination?.offset ?? 0)
      .limit(pagination?.limit ?? 50)
      .exec();
  }

  async findById(id: string): Promise<DeviceDocument | null> {
    return this.deviceModel.findById(id).exec();
  }

  async revoke(id: string, now: Date): Promise<DeviceDocument | null> {
    return this.deviceModel
      .findByIdAndUpdate(
        id,
        { $set: { isActive: false, revokedAt: now } },
        { new: true },
      )
      .exec();
  }

  async touchLastSeen(keyHash: string, now: Date): Promise<void> {
    await this.deviceModel
      .updateOne({ keyHash }, { $set: { lastSeenAt: now } })
      .exec();
  }
}
