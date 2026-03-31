import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TenantContext } from '../../memberships/decorators/current-tenant.decorator';
import { REQUIRED_MEMBERSHIP_ROLES_KEY } from '../decorators/require-membership-roles.decorator';
import type { MembershipRole } from '../membership-role';

@Injectable()
export class MembershipRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<MembershipRole[]>(
        REQUIRED_MEMBERSHIP_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const tenant = (request as Request & { tenant?: TenantContext }).tenant;
    if (!tenant) {
      throw new UnauthorizedException('Missing tenant context');
    }

    // A managing agent (property management company) has owner-equivalent rights
    const effectiveRole =
      tenant.isManagingAgent && tenant.role === 'operator' ? 'owner' : tenant.role;

    if (!requiredRoles.includes(effectiveRole)) {
      throw new UnauthorizedException(
        'Insufficient role for this organization',
      );
    }

    return true;
  }
}
