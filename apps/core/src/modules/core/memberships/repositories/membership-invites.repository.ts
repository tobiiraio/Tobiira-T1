import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { MembershipRole, StaffRole } from '@tobiira/common';
import {
  MembershipInvite,
  MembershipInviteDocument,
} from '../schemas/membership-invite.schema';

@Injectable()
export class MembershipInvitesRepository {
  constructor(
    @InjectModel(MembershipInvite.name)
    private readonly membershipInviteModel: Model<MembershipInviteDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    invitedEmail: string;
    role: MembershipRole;
    staffRole?: StaffRole | null;
    isManagingAgent?: boolean;
    tokenHash: string;
    expiresAt: Date;
    createdByUserId: string;
  }): Promise<MembershipInviteDocument> {
    return this.membershipInviteModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      invitedEmail: params.invitedEmail,
      role: params.role,
      staffRole: params.staffRole ?? null,
      isManagingAgent: params.isManagingAgent ?? false,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      createdByUserId: new Types.ObjectId(params.createdByUserId),
      acceptedAt: null,
      acceptedByUserId: null,
      revokedAt: null,
    });
  }

  async findValidByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<MembershipInviteDocument | null> {
    return this.membershipInviteModel
      .findOne({
        tokenHash,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { $gt: now },
      })
      .exec();
  }

  async markAccepted(params: {
    tokenHash: string;
    acceptedAt: Date;
    acceptedByUserId: Types.ObjectId;
  }): Promise<void> {
    await this.membershipInviteModel
      .updateOne(
        { tokenHash: params.tokenHash, acceptedAt: null, revokedAt: null },
        {
          $set: {
            acceptedAt: params.acceptedAt,
            acceptedByUserId: params.acceptedByUserId,
          },
        },
      )
      .exec();
  }
}
