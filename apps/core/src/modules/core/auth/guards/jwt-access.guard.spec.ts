import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessGuard } from './jwt-access.guard';
import type { AuthService } from '../auth.service';

describe('JwtAccessGuard', () => {
  const makeContext = (request: Partial<Request>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it('attaches user to request', async () => {
    const authService = {
      getSessionUserFromAccessToken: jest
        .fn()
        .mockResolvedValue({ userId: 'u1', email: 'u1@example.com' }),
    } as unknown as AuthService;

    const guard = new JwtAccessGuard(authService);
    const req = {
      headers: { authorization: 'Bearer token' },
    } as Partial<Request> as Request & { user?: unknown };

    const result = await guard.canActivate(makeContext(req));

    expect(result).toBe(true);
    expect(req.user).toEqual({ userId: 'u1', email: 'u1@example.com' });
  });

  it('throws when missing bearer token', async () => {
    const guard = new JwtAccessGuard({} as unknown as AuthService);
    await expect(
      guard.canActivate(makeContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
