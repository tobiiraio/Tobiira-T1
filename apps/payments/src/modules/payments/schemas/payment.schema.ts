import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money';
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'mobile_money'];

export type PaymentStatus = 'recorded' | 'voided';
export const PAYMENT_STATUSES: PaymentStatus[] = ['recorded', 'voided'];

// manual = staff recorded; platform = initiated through Tobiira (Phase 2)
export type PaymentSource = 'manual' | 'platform';
export const PAYMENT_SOURCES: PaymentSource[] = ['manual', 'platform'];

@Schema({ _id: false })
export class PeriodCovered {
  @Prop({ required: true }) from: Date;
  @Prop({ required: true }) to: Date;
}

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  // The vertical and resource this payment is for (e.g. 'lease', 'booking', 'subscription')
  @Prop({ required: true, trim: true, index: true })
  resourceType: string;

  // ID of the resource in its vertical service
  @Prop({ required: true, trim: true, index: true })
  resourceId: string;

  // The user who made the payment (tenant, customer, etc.)
  @Prop({ required: true, type: Types.ObjectId, index: true })
  payerId: Types.ObjectId;

  // Denormalized for quick lookup and email delivery without cross-service calls
  @Prop({ required: true, trim: true, lowercase: true })
  payerEmail: string;

  @Prop({ required: false, trim: true })
  payerName?: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, trim: true, uppercase: true })
  currency: string;

  @Prop({ required: true, enum: PAYMENT_METHODS, type: String })
  method: PaymentMethod;

  // Bank/mobile money reference or receipt number
  @Prop({ required: false, trim: true })
  reference?: string;

  // The period this payment covers (optional — relevant for recurring payments like rent)
  @Prop({ required: false, type: PeriodCovered })
  periodCovered?: PeriodCovered;

  @Prop({ required: true })
  paidAt: Date;

  @Prop({ required: false, trim: true })
  notes?: string;

  // Who recorded this payment (staff/operator user id)
  @Prop({ required: true, type: Types.ObjectId })
  recordedByUserId: Types.ObjectId;

  // manual = recorded by staff; platform = initiated through Tobiira in-app payment (Phase 2)
  @Prop({ required: true, enum: PAYMENT_SOURCES, type: String, default: 'manual' })
  source: PaymentSource;

  @Prop({ required: true, enum: PAYMENT_STATUSES, type: String, default: 'recorded' })
  status: PaymentStatus;

  // Populated when voided
  @Prop({ type: Date, default: null })
  voidedAt: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  voidedByUserId: Types.ObjectId | null;

  @Prop({ required: false, trim: true })
  voidReason?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ organizationId: 1, resourceType: 1, resourceId: 1, createdAt: -1 });
PaymentSchema.index({ organizationId: 1, payerId: 1, status: 1 });
