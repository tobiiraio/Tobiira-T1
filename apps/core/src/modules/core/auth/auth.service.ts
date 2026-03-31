import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash, randomInt } from 'crypto';
import { CoreEvents } from '@tobiira/common';
import { UsersRepository } from '../users/users.repository';
import { EventPublisher } from '../../../rabbitmq/event-publisher.service';
import { AuthRepository } from './auth.repository';

const hashToken = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const generateNumericCode = (length: number): string => {
  const safeLength = Math.max(4, Math.min(12, length));
  let result = '';
  for (let i = 0; i < safeLength; i += 1) {
    result += String(randomInt(0, 10));
  }
  return result;
};

const parseExpiresInSeconds = (value: string): number => {
  const trimmed = value.trim();
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) return Math.floor(asNumber);

  const match = trimmed.match(/^(\d+)\s*([smhd])$/i);
  if (!match) return 15 * 60;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return 15 * 60;

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * (multipliers[unit] ?? 60);
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async requestOtp(emailRaw: string): Promise<{ ok: true }> {
    const email = emailRaw.trim().toLowerCase();

    const otpLength = Number(this.configService.get<string>('OTP_LENGTH') ?? 6);
    const ttlMinutes = Number(
      this.configService.get<string>('OTP_TTL_MINUTES') ?? 10,
    );

    const code = generateNumericCode(otpLength);
    const expiresAt = new Date(Date.now() + Math.max(1, ttlMinutes) * 60_000);

    await this.authRepository.createOtpChallenge({
      email,
      codeHash: hashToken(code),
      expiresAt,
    });

    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    if (nodeEnv === 'development') {
      this.logger.log(`DEV OTP for ${email}: ${code}`);
    }

    this.eventPublisher.emit(CoreEvents.AUTH_OTP_REQUESTED, {
      email,
      code,
      ttlMinutes: Math.max(1, ttlMinutes),
    });

    return { ok: true };
  }

  async verifyOtp(params: {
    email: string;
    code: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const email = params.email.trim().toLowerCase();
    const code = params.code.trim();
    const now = new Date();

    const challenge = await this.authRepository.findLatestValidOtpChallenge(
      email,
      now,
    );
    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (challenge.codeHash !== hashToken(code)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.authRepository.consumeOtpChallenge(String(challenge._id), now);

    const { user, createdNew } =
      await this.usersRepository.createIfMissing(email);

    if (!createdNew) {
      await this.usersRepository.markEmailVerifiedById(String(user._id));
    }

    if (createdNew) {
      this.eventPublisher.emit(CoreEvents.USER_CREATED, {
        userId: String(user._id),
        email: user.email,
      });
    }

    const jwtExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      this.configService.get<string>('JWT_EXPIRES_IN') ??
      '15m';

    const accessToken = await this.jwtService.signAsync(
      { email: user.email },
      {
        subject: String(user._id),
        expiresIn: parseExpiresInSeconds(jwtExpiresIn),
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);

    const refreshTtlDays = Number(
      this.configService.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? 30,
    );
    const refreshExpiresAt = new Date(
      Date.now() + Math.max(1, refreshTtlDays) * 24 * 60 * 60_000,
    );

    await this.authRepository.createRefreshToken({
      userId: String(user._id),
      tokenHash: refreshTokenHash,
      expiresAt: refreshExpiresAt,
    });

    return { accessToken, refreshToken };
  }

  async refreshSession(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const now = new Date();
    const tokenHash = hashToken(refreshToken);

    const existing = await this.authRepository.findValidRefreshTokenByHash(
      tokenHash,
      now,
    );
    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.authRepository.revokeRefreshToken(tokenHash, now);

    const user = await this.usersRepository.findById(String(existing.userId));
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const jwtExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      this.configService.get<string>('JWT_EXPIRES_IN') ??
      '15m';

    const accessToken = await this.jwtService.signAsync(
      { email: user.email },
      {
        subject: String(user._id),
        expiresIn: parseExpiresInSeconds(jwtExpiresIn),
      },
    );

    const newRefreshToken = randomBytes(48).toString('hex');
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const refreshTtlDays = Number(
      this.configService.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? 30,
    );
    const refreshExpiresAt = new Date(
      Date.now() + Math.max(1, refreshTtlDays) * 24 * 60 * 60_000,
    );

    await this.authRepository.createRefreshToken({
      userId: String(user._id),
      tokenHash: newRefreshTokenHash,
      expiresAt: refreshExpiresAt,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async getSessionUserFromAccessToken(
    accessToken: string,
  ): Promise<{ userId: string; email: string }> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      email: string;
    }>(accessToken);

    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }

    return { userId: payload.sub, email: user.email };
  }
}
