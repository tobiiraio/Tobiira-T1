import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { MembershipsRepository } from '../memberships.repository';
import type { TenantContext } from '../decorators/current-tenant.decorator';
import type { CurrentUser } from '../../auth/decorators/current-user.decorator';

const getOrganizationIdFromRequest = (request: Request): string | null => {
  const header = request.headers['x-organization-id'];
  const headerValue = Array.isArray(header) ? header[0] : header;
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  const params = (request.params ?? {}) as Record<string, unknown>;
  const paramValue =
    (typeof params.organizationId === 'string' && params.organizationId) ||
    (typeof params.orgId === 'string' && params.orgId);
  if (paramValue) return paramValue;

  return null;
};

@Injectable()
export class OrganizationMembershipGuard implements CanActivate {
  constructor(private readonly membershipsRepository: MembershipsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CurrentUser }).user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const organizationId = getOrganizationIdFromRequest(request);
    if (!organizationId) {
      throw new UnauthorizedException('Missing x-organization-id');
    }

    const membership =
      await this.membershipsRepository.findByUserAndOrganization(
        user.userId,
        organizationId,
      );
    if (!membership) {
      throw new UnauthorizedException('Not a member of this organization');
    }

    (request as Request & { tenant: TenantContext }).tenant = {
      organizationId,
      role: membership.role,
      isManagingAgent: membership.isManagingAgent ?? false,
    };

    return true;
  }
}
