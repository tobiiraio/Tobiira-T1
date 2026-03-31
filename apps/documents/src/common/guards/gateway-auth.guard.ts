import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { GATEWAY_HEADERS } from '@tobiira/common';

export type GatewayUser = { userId: string; orgId: string };

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.headers[GATEWAY_HEADERS.USER_ID];
    const orgId = request.headers[GATEWAY_HEADERS.ORG_ID];
    const userIdValue = Array.isArray(userId) ? userId[0] : userId;
    const orgIdValue = Array.isArray(orgId) ? orgId[0] : orgId;
    if (!userIdValue || !orgIdValue) {
      throw new UnauthorizedException('Missing gateway authentication headers');
    }
    (request as any).gatewayUser = { userId: userIdValue, orgId: orgIdValue };
    return true;
  }
}
