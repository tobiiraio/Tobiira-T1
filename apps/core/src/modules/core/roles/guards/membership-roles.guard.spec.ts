import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { MembershipRolesGuard } from './membership-roles.guard';
import type { TenantContext } from '../../memberships/decorators/current-tenant.decorator';

describe('MembershipRolesGuard', () => {
  const makeContext = (request: Partial<Request>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  it('allows when no roles required', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new MembershipRolesGuard(reflector);

    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('throws when tenant missing', () => {
    const reflector = {
      getAllAndOverride: () => ['owner'],
    } as unknown as Reflector;
    const guard = new MembershipRolesGuard(reflector);

    expect(() => guard.canActivate(makeContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws when role insufficient', () => {
    const reflector = {
      getAllAndOverride: () => ['owner'],
    } as unknown as Reflector;
    const guard = new MembershipRolesGuard(reflector);

    const request = {
      tenant: { organizationId: 'o1', role: 'occupant' },
    } as unknown as Partial<Request> & { tenant: TenantContext };

    expect(() => guard.canActivate(makeContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows when role matches', () => {
    const reflector = {
      getAllAndOverride: () => ['owner', 'operator'],
    } as unknown as Reflector;
    const guard = new MembershipRolesGuard(reflector);

    const request = {
      tenant: { organizationId: 'o1', role: 'operator' },
    } as unknown as Partial<Request> & { tenant: TenantContext };

    expect(guard.canActivate(makeContext(request))).toBe(true);
  });
});
