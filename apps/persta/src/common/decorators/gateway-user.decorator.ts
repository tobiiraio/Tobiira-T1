import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GATEWAY_HEADERS } from '@tobiira/common';
import type { Request } from 'express';

export interface GatewayUser {
  userId: string;
  email: string;
  organizationId: string;
}

export const GatewayUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GatewayUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return {
      userId: request.headers[GATEWAY_HEADERS.USER_ID] as string,
      email: request.headers[GATEWAY_HEADERS.USER_EMAIL] as string,
      organizationId: request.headers[GATEWAY_HEADERS.ORG_ID] as string,
    };
  },
);
