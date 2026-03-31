import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GATEWAY_HEADERS } from '@tobiira/common';
import type { Request } from 'express';

// Validates that Kong-injected identity headers are present.
// The actual JWT verification is done by Kong upstream.
@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.headers[GATEWAY_HEADERS.USER_ID];
    const orgId = request.headers[GATEWAY_HEADERS.ORG_ID];

    if (!userId || !orgId) {
      throw new UnauthorizedException('Missing gateway identity headers');
    }
    return true;
  }
}
