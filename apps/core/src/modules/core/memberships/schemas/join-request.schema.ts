import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type JoinRequestDocument = HydratedDocument<JoinRequest>;
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

@Schema({ timestamps: true })
export class JoinRequest {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true })
  userEmail: string;

  @Prop({ required: false, trim: true })
  message?: string;

  @Prop({ required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: JoinRequestStatus;

  @Prop({ required: false, type: Types.ObjectId, default: null })
  resolvedByUserId: Types.ObjectId | null;

  @Prop({ required: false, default: null })
  resolvedAt: Date | null;
}

export const JoinRequestSchema = SchemaFactory.createForClass(JoinRequest);
// one pending request per user per org
JoinRequestSchema.index(
  { organizationId: 1, userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);
