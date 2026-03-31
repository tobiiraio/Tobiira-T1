import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { AuthRepository } from './auth.repository';
import type { UsersRepository } from '../users/users.repository';
import type { EventPublisher } from '../../../rabbitmq/event-publisher.service';

describe('AuthService', () => {
  const makeConfigService = (
    overrides?: Record<string, string | undefined>,
  ): ConfigService =>
    ({
      get: (key: string) => overrides?.[key],
    }) as unknown as ConfigService;

  const makeEventPublisher = (): EventPublisher =>
    ({ emit: jest.fn() }) as unknown as EventPublisher;

  it('requestOtp stores OTP challenge and emits event', async () => {
    const createOtpChallenge = jest.fn().mockResolvedValue(undefined);
    const emit = jest.fn();

    const authRepository = {
      createOtpChallenge,
    } as unknown as AuthRepository;

    const service = new AuthService(
      makeConfigService({
        OTP_LENGTH: '6',
        OTP_TTL_MINUTES: '10',
        NODE_ENV: 'test',
      }),
      { signAsync: jest.fn() } as unknown as JwtService,
      authRepository,
      {} as unknown as UsersRepository,
      { emit } as unknown as EventPublisher,
    );

    await service.requestOtp('test@example.com');

    expect(createOtpChallenge).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);

    const [event, payload] = emit.mock.calls[0];
    expect(event).toBe('core.auth.otp_requested');
    expect(payload.email).toBe('test@example.com');
    expect(payload.ttlMinutes).toBe(10);
    expect(payload.code).toHaveLength(6);
  });

  it('verifyOtp emits user.created event when user is new', async () => {
    const emit = jest.fn();

    const authRepository = {
      findLatestValidOtpChallenge: jest.fn().mockResolvedValue({
        _id: 'otp1',
        codeHash:
          '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
      }),
      consumeOtpChallenge: jest.fn().mockResolvedValue(undefined),
      createRefreshToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthRepository;

    const usersRepository = {
      createIfMissing: jest.fn().mockResolvedValue({
        user: { _id: 'u1', email: 'new@example.com' },
        createdNew: true,
      }),
      findById: jest.fn(),
    } as unknown as UsersRepository;

    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('access.jwt'),
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    const service = new AuthService(
      makeConfigService({
        JWT_ACCESS_EXPIRES_IN: '15m',
        REFRESH_TOKEN_TTL_DAYS: '30',
      }),
      jwtService,
      authRepository,
      usersRepository,
      { emit } as unknown as EventPublisher,
    );

    const result = await service.verifyOtp({
      email: 'new@example.com',
      code: '123456',
    });

    expect(result.accessToken).toBe('access.jwt');
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(emit).toHaveBeenCalledWith('core.user.created', {
      userId: 'u1',
      email: 'new@example.com',
    });
  });

  it('refreshSession rotates refresh token and returns new tokens', async () => {
    const createRefreshToken = jest.fn().mockResolvedValue(undefined);
    const revokeRefreshToken = jest.fn().mockResolvedValue(undefined);

    const service = new AuthService(
      makeConfigService({ JWT_ACCESS_EXPIRES_IN: '15m', REFRESH_TOKEN_TTL_DAYS: '30' }),
      { signAsync: jest.fn().mockResolvedValue('new.access.jwt') } as unknown as JwtService,
      {
        findValidRefreshTokenByHash: jest.fn().mockResolvedValue({ userId: 'u1' }),
        revokeRefreshToken,
        createRefreshToken,
      } as unknown as AuthRepository,
      {
        findById: jest.fn().mockResolvedValue({ _id: 'u1', email: 'u@example.com' }),
      } as unknown as UsersRepository,
      makeEventPublisher(),
    );

    const result = await service.refreshSession('old-refresh-token');

    expect(revokeRefreshToken).toHaveBeenCalledTimes(1);
    expect(createRefreshToken).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('new.access.jwt');
    expect(result.refreshToken).not.toBe('old-refresh-token');
    expect(result.refreshToken).toHaveLength(96); // 48 bytes → 96 hex chars
  });

  it('refreshSession rejects an invalid refresh token', async () => {
    const service = new AuthService(
      makeConfigService(),
      { signAsync: jest.fn() } as unknown as JwtService,
      {
        findValidRefreshTokenByHash: jest.fn().mockResolvedValue(null),
      } as unknown as AuthRepository,
      {} as unknown as UsersRepository,
      makeEventPublisher(),
    );

    await expect(service.refreshSession('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifyOtp rejects invalid OTP', async () => {
    const service = new AuthService(
      makeConfigService(),
      { signAsync: jest.fn() } as unknown as JwtService,
      {
        findLatestValidOtpChallenge: jest.fn().mockResolvedValue(null),
      } as unknown as AuthRepository,
      {} as unknown as UsersRepository,
      makeEventPublisher(),
    );

    await expect(
      service.verifyOtp({ email: 'a@b.com', code: '000000' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
