import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async createIfMissing(email: string): Promise<{
    user: UserDocument;
    createdNew: boolean;
  }> {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.findByEmail(normalizedEmail);
    if (existing) return { user: existing, createdNew: false };

    try {
      const user = await this.userModel.create({
        email: normalizedEmail,
        isEmailVerified: true,
      });
      return { user, createdNew: true };
    } catch {
      const raced = await this.findByEmail(normalizedEmail);
      if (raced) return { user: raced, createdNew: false };
      throw new Error('Failed to create user');
    }
  }

  async findById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  async findByIds(userIds: readonly string[]): Promise<UserDocument[]> {
    return this.userModel.find({ _id: { $in: userIds } }).exec();
  }

  async updateById(
    userId: string,
    update: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      dateOfBirth?: Date;
      phone?: string;
    },
  ): Promise<UserDocument | null> {
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, unknown> = {};

    const optionalStringFields = ['firstName', 'lastName', 'avatarUrl'] as const;
    for (const field of optionalStringFields) {
      if (typeof update[field] !== 'undefined') {
        if (update[field]) $set[field] = update[field];
        else $unset[field] = 1;
      }
    }

    if (typeof update.dateOfBirth !== 'undefined') {
      if (update.dateOfBirth) $set.dateOfBirth = update.dateOfBirth;
      else $unset.dateOfBirth = 1;
    }

    if (typeof update.phone !== 'undefined') {
      if (update.phone) {
        $set.phone = update.phone;
        $set.isPhoneVerified = false;
      } else {
        $unset.phone = 1;
        $unset.isPhoneVerified = 1;
      }
    }

    const nextUpdate: Record<string, unknown> = {};
    if (Object.keys($set).length) nextUpdate.$set = $set;
    if (Object.keys($unset).length) nextUpdate.$unset = $unset;
    if (!Object.keys(nextUpdate).length) return this.findById(userId);

    return this.userModel
      .findByIdAndUpdate(userId, nextUpdate, { new: true })
      .exec();
  }

  async markEmailVerifiedById(userId: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId, isEmailVerified: { $ne: true } },
        { $set: { isEmailVerified: true } },
      )
      .exec();
  }
}
