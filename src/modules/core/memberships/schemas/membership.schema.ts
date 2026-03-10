import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MEMBERSHIP_ROLES } from '../../roles/membership-role';
import type { MembershipRole } from '../../roles/membership-role';

export type MembershipDocument = HydratedDocument<Membership>;

@Schema({ timestamps: true })
export class Membership {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, enum: MEMBERSHIP_ROLES, type: String })
  role: MembershipRole;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
