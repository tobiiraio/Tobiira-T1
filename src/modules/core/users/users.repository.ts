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
      const user = await this.userModel.create({ email: normalizedEmail });
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
}
