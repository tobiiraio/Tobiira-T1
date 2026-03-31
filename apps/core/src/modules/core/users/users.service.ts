import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import type { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getMe(params: { userId: string }): Promise<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    dateOfBirth?: Date;
    phone?: string;
    isEmailVerified: boolean;
    isPhoneVerified?: boolean;
    systemRole: string;
  }> {
    const user = await this.usersRepository.findById(params.userId);
    if (!user) throw new NotFoundException('User not found');
    return this.mapUser(user);
  }

  async getUserById(params: { userId: string }): Promise<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }> {
    const user = await this.usersRepository.findById(params.userId);
    if (!user) throw new NotFoundException('User not found');
    return {
      id: String(user._id),
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      phone: user.phone ?? undefined,
    };
  }

  async updateMe(params: { userId: string; dto: UpdateMeDto }): Promise<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    dateOfBirth?: Date;
    phone?: string;
    isEmailVerified: boolean;
    isPhoneVerified?: boolean;
  }> {
    const update: Parameters<UsersRepository['updateById']>[1] = {};

    if (typeof params.dto.firstName !== 'undefined') update.firstName = params.dto.firstName.trim() || undefined;
    if (typeof params.dto.lastName !== 'undefined') update.lastName = params.dto.lastName.trim() || undefined;
    if (typeof params.dto.avatarUrl !== 'undefined') update.avatarUrl = params.dto.avatarUrl || undefined;
    if (typeof params.dto.dateOfBirth !== 'undefined') update.dateOfBirth = params.dto.dateOfBirth ? new Date(params.dto.dateOfBirth) : undefined;
    if (typeof params.dto.phone !== 'undefined') update.phone = params.dto.phone.trim() || undefined;

    const user = await this.usersRepository.updateById(params.userId, update);
    if (!user) throw new NotFoundException('User not found');
    return this.mapUser(user);
  }

  private mapUser(user: any) {
    return {
      id: String(user._id),
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      dateOfBirth: user.dateOfBirth ?? undefined,
      phone: user.phone ?? undefined,
      isEmailVerified: Boolean(user.isEmailVerified),
      isPhoneVerified: typeof user.isPhoneVerified === 'boolean' ? user.isPhoneVerified : undefined,
      systemRole: (user.systemRole as string) ?? 'user',
    };
  }
}
