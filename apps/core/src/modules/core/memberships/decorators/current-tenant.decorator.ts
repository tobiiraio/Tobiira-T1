import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { MembershipRole } from '../../roles/membership-role';

export type TenantContext = {
  organizationId: string;
  role: MembershipRole;
  isManagingAgent: boolean;
};

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const tenant = (request as Request & { tenant?: TenantContext }).tenant;
    if (!tenant) {
      throw new Error(
        'CurrentTenant is missing. Did you forget OrganizationMembershipGuard?',
      );
    }
    return tenant;
  },
);
