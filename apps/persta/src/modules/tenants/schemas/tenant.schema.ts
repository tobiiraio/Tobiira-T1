import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

export type IdType = 'national_id' | 'passport' | 'driving_license' | 'other';

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;
}

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  // reference to core User._id — source of truth for identity
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId: Types.ObjectId;

  // denormalized from core at enrollment time
  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: false, trim: true })
  firstName?: string;

  @Prop({ required: false, trim: true })
  lastName?: string;

  @Prop({ required: false, trim: true })
  phone?: string;

  // Persta-specific identity fields
  @Prop({ required: false, enum: ['national_id', 'passport', 'driving_license', 'other'] })
  idType?: IdType;

  @Prop({ required: false, trim: true })
  idNumber?: string;

  @Prop({ required: false, type: EmergencyContact })
  emergencyContact?: EmergencyContact;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
TenantSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
