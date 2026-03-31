import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MEMBERSHIP_ROLES } from '../../roles/membership-role';
import type { MembershipRole } from '../../roles/membership-role';
import { STAFF_ROLES } from '@tobiira/common';
import type { StaffRole } from '@tobiira/common';

export type MembershipDocument = HydratedDocument<Membership>;

@Schema({ timestamps: true })
export class Membership {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, enum: MEMBERSHIP_ROLES, type: String })
  role: MembershipRole;

  // Only set when role === 'operator' — identifies the staff member's function
  @Prop({ required: false, enum: STAFF_ROLES, type: String, default: null })
  staffRole: StaffRole | null;

  // Property management companies acting on behalf of the owner get full owner-equivalent rights
  @Prop({ required: false, type: Boolean, default: false })
  isManagingAgent: boolean;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
