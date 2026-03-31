import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UnitDocument = HydratedDocument<Unit>;

export type UnitStatus = 'vacant' | 'occupied' | 'maintenance';
export type PaymentFrequency = 'monthly' | 'weekly' | 'quarterly';

@Schema({ timestamps: true })
export class Unit {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true, ref: 'Property' })
  propertyId: Types.ObjectId;

  // null means unit belongs directly to the property (no block)
  @Prop({ required: false, type: Types.ObjectId, index: true, ref: 'Block', default: null })
  blockId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: true, type: Number })
  rentAmount: number;

  @Prop({ required: true, trim: true, default: 'KES' })
  currency: string;

  @Prop({ required: true, enum: ['monthly', 'weekly', 'quarterly'], default: 'monthly' })
  paymentFrequency: PaymentFrequency;

  @Prop({ required: true, enum: ['vacant', 'occupied', 'maintenance'], default: 'vacant' })
  status: UnitStatus;

  @Prop({ required: false, type: Number })
  floorNumber?: number;

  @Prop({ required: false, type: Number })
  sizeSqm?: number;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);
UnitSchema.index({ propertyId: 1, name: 1 }, { unique: true });
