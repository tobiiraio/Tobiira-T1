import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({ _id: false })
export class OrganizationLocation {
  @Prop({ required: true, type: Number })
  lat: number;

  @Prop({ required: true, type: Number })
  lng: number;
}

// Addon feature flags unlocked for this org (e.g. 'lumi_hardware', 'lumi_ai_insights')
// Empty array = free tier — all core vertical features are available by default
@Schema({ _id: false })
export class OrganizationPlan {
  @Prop({ required: true, type: [String], default: [] })
  featureFlags: string[];

  // Billing service subscription ID — null until the org purchases an addon
  @Prop({ required: false, type: String, default: null })
  billingRef: string | null;
}

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  address?: string;

  @Prop({ required: false, type: OrganizationLocation })
  location?: OrganizationLocation;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  createdByUserId: Types.ObjectId;

  @Prop({ required: true, type: OrganizationPlan, default: () => ({ featureFlags: [], billingRef: null }) })
  plan: OrganizationPlan;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
