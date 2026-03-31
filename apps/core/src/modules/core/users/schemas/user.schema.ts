import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SYSTEM_ROLES } from '@tobiira/common';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: false, trim: true })
  firstName?: string;

  @Prop({ required: false, trim: true })
  lastName?: string;

  @Prop({ required: false, trim: true })
  avatarUrl?: string;

  @Prop({ required: false })
  dateOfBirth?: Date;

  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: true, default: false })
  isEmailVerified: boolean;

  @Prop({ required: false, default: undefined })
  isPhoneVerified?: boolean;

  @Prop({ required: true, enum: SYSTEM_ROLES, type: String, default: 'user' })
  systemRole: 'superadmin' | 'support' | 'user';
}

export const UserSchema = SchemaFactory.createForClass(User);
