import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { AuthRepository } from './auth.repository';
import type { UsersRepository } from '../users/users.repository';
import type { NotificationsService } from '../notifications/notifications.service';

describe('AuthService', () => {
  const makeConfigService = (
    overrides?: Record<string, string | undefined>,
  ): ConfigService =>
    ({
      get: (key: string) => overrides?.[key],
    }) as unknown as ConfigService;

  it('requestOtp sends OTP email (non-blocking)', async () => {
    const authRepository = {
      createOtpChallenge: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthRepository;

    const notificationsService = {
      sendAuthOtpEmail: jest.fn().mockResolvedValue(undefined),
      sendWelcomeEmail: jest.fn(),
    } as unknown as NotificationsService;

    const service = new AuthService(
      makeConfigService({
        OTP_LENGTH: '6',
        OTP_TTL_MINUTES: '10',
        NODE_ENV: 'test',
      }),
      { signAsync: jest.fn() } as unknown as JwtService,
      authRepository,
      {} as unknown as UsersRepository,
      notificationsService,
    );

    await service.requestOtp('test@example.com');

    expect(authRepository.createOtpChallenge).toHaveBeenCalledTimes(1);
    expect(notificationsService.sendAuthOtpEmail).toHaveBeenCalledTimes(1);

    const call = (
      notificationsService.sendAuthOtpEmail as jest.Mock
    ).mock.calls[0][0] as { email: string; code: string; ttlMinutes: number };
    expect(call.email).toBe('test@example.com');
    expect(call.ttlMinutes).toBe(10);
    expect(call.code).toHaveLength(6);
  });

  it('verifyOtp sends welcome email when user is new', async () => {
    const authRepository = {
      findLatestValidOtpChallenge: jest.fn().mockResolvedValue({
        _id: 'otp1',
        codeHash:
          'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', // sha1("test") not used, just placeholder
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

    const notificationsService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('access.jwt'),
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    // Build a codeHash that matches the real implementation (sha256 hex).
    // "123456" => sha256("123456") = 8d969eef... (known).
    (authRepository.findLatestValidOtpChallenge as jest.Mock).mockResolvedValue({
      _id: 'otp1',
      codeHash:
        '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    });

    const service = new AuthService(
      makeConfigService({
        JWT_ACCESS_EXPIRES_IN: '15m',
        REFRESH_TOKEN_TTL_DAYS: '30',
      }),
      jwtService,
      authRepository,
      usersRepository,
      notificationsService,
    );

    const result = await service.verifyOtp({
      email: 'new@example.com',
      code: '123456',
    });

    expect(result.accessToken).toBe('access.jwt');
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(notificationsService.sendWelcomeEmail).toHaveBeenCalledWith({
      email: 'new@example.com',
    });
  });

  it('verifyOtp rejects invalid OTP', async () => {
    const service = new AuthService(
      makeConfigService(),
      { signAsync: jest.fn() } as unknown as JwtService,
      {
        findLatestValidOtpChallenge: jest.fn().mockResolvedValue(null),
      } as unknown as AuthRepository,
      {} as unknown as UsersRepository,
      {} as unknown as NotificationsService,
    );

    await expect(
      service.verifyOtp({ email: 'a@b.com', code: '000000' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
