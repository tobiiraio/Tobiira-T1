import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DeviceDocument = HydratedDocument<Device>;

@Schema({ timestamps: true })
export class Device {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  hardwareId?: string;

  @Prop({ required: true, unique: true, index: true })
  keyHash: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  lastSeenAt: Date | null;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
DeviceSchema.index({ organizationId: 1, isActive: 1 });
