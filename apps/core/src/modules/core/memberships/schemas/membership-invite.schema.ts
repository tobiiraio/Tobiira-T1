import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MEMBERSHIP_ROLES, STAFF_ROLES } from '@tobiira/common';
import type { MembershipRole, StaffRole } from '@tobiira/common';

export type MembershipInviteDocument = HydratedDocument<MembershipInvite>;

@Schema({ timestamps: true })
export class MembershipInvite {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  invitedEmail: string;

  @Prop({ required: true, enum: MEMBERSHIP_ROLES, type: String })
  role: MembershipRole;

  @Prop({ required: false, enum: STAFF_ROLES, type: String, default: null })
  staffRole: StaffRole | null;

  @Prop({ required: false, type: Boolean, default: false })
  isManagingAgent: boolean;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true, type: Types.ObjectId })
  createdByUserId: Types.ObjectId;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  acceptedByUserId: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;
}

export const MembershipInviteSchema =
  SchemaFactory.createForClass(MembershipInvite);

MembershipInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
MembershipInviteSchema.index(
  { organizationId: 1, invitedEmail: 1, revokedAt: 1, acceptedAt: 1 },
  { name: 'active_invite_lookup' },
);
