import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { PaymentFrequency } from '../../properties/schemas/unit.schema';

export type LeaseDocument = HydratedDocument<Lease>;

export type LeaseStatus = 'pending' | 'active' | 'expired' | 'terminated';

@Schema({ timestamps: true })
export class Lease {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true, ref: 'Unit' })
  unitId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  // agreed rent — defaults to unit's listed price but can be overridden
  @Prop({ required: true, type: Number })
  rentAmount: number;

  @Prop({ required: true, trim: true })
  currency: string;

  @Prop({ required: true, enum: ['monthly', 'weekly', 'quarterly'], default: 'monthly' })
  paymentFrequency: PaymentFrequency;

  @Prop({ required: false, type: Number, default: 0 })
  depositAmount: number;

  @Prop({ required: true, enum: ['pending', 'active', 'expired', 'terminated'], default: 'pending' })
  status: LeaseStatus;

  @Prop({ required: false })
  terminatedAt?: Date;

  @Prop({ required: false, trim: true })
  terminatedReason?: string;
}

export const LeaseSchema = SchemaFactory.createForClass(Lease);
LeaseSchema.index({ unitId: 1, status: 1 });
LeaseSchema.index({ tenantId: 1, status: 1 });
