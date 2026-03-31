import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OtpChallenge,
  OtpChallengeDocument,
} from './schemas/otp-challenge.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(OtpChallenge.name)
    private readonly otpChallengeModel: Model<OtpChallenge>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  async createOtpChallenge(params: {
    email: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<OtpChallengeDocument> {
    return this.otpChallengeModel.create({
      email: params.email,
      codeHash: params.codeHash,
      expiresAt: params.expiresAt,
      consumedAt: null,
    });
  }

  async findLatestValidOtpChallenge(
    email: string,
    now: Date,
  ): Promise<OtpChallengeDocument | null> {
    return this.otpChallengeModel
      .findOne({
        email,
        consumedAt: null,
        expiresAt: { $gt: now },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async consumeOtpChallenge(id: string, now: Date): Promise<void> {
    await this.otpChallengeModel
      .updateOne({ _id: id, consumedAt: null }, { $set: { consumedAt: now } })
      .exec();
  }

  async createRefreshToken(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenDocument> {
    return this.refreshTokenModel.create({
      userId: params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      revokedAt: null,
    });
  }

  async findValidRefreshTokenByHash(
    tokenHash: string,
    now: Date,
  ): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel
      .findOne({
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: now },
      })
      .exec();
  }

  async revokeRefreshToken(tokenHash: string, now: Date): Promise<void> {
    await this.refreshTokenModel
      .updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: now } })
      .exec();
  }
}
