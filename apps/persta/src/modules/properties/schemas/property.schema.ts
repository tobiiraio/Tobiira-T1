import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PropertyDocument = HydratedDocument<Property>;

export type PropertyType = 'residential' | 'commercial' | 'mixed';

@Schema({ _id: false })
export class PropertyLocation {
  @Prop({ required: true, type: Number })
  lat: number;

  @Prop({ required: true, type: Number })
  lng: number;
}

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  address?: string;

  @Prop({ required: false, type: PropertyLocation })
  location?: PropertyLocation;

  @Prop({ required: true, enum: ['residential', 'commercial', 'mixed'], default: 'residential' })
  type: PropertyType;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  createdByUserId: Types.ObjectId;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
PropertySchema.index({ organizationId: 1, name: 1 }, { unique: true });
