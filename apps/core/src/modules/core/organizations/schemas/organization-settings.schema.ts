import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrganizationSettingsDocument = HydratedDocument<OrganizationSettings>;

@Schema({ timestamps: true })
export class OrganizationSettings {
  @Prop({ required: true, unique: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: 'en' })
  locale: string;

  @Prop({ type: Object, default: {} })
  vertical: Record<string, unknown>;
}

export const OrganizationSettingsSchema =
  SchemaFactory.createForClass(OrganizationSettings);
