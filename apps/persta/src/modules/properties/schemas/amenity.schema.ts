import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AmenityDocument = HydratedDocument<Amenity>;

export type AmenityLevel = 'property' | 'block' | 'unit';
export type AmenityStatus = 'available' | 'unavailable' | 'maintenance';

@Schema({ timestamps: true })
export class Amenity {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  // which level this amenity belongs to
  @Prop({ required: true, enum: ['property', 'block', 'unit'] })
  level: AmenityLevel;

  // the id of the property / block / unit it belongs to
  @Prop({ required: true, type: Types.ObjectId, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: false, trim: true })
  type?: string; // e.g. "pool", "gym", "parking", "elevator"

  @Prop({ required: false, type: Number })
  capacity?: number;

  @Prop({ required: true, enum: ['available', 'unavailable', 'maintenance'], default: 'available' })
  status: AmenityStatus;
}

export const AmenitySchema = SchemaFactory.createForClass(Amenity);
AmenitySchema.index({ ownerId: 1, level: 1 });
