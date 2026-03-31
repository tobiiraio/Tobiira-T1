import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { GatewayUser } from '../guards/gateway-auth.guard';

export const CurrentGatewayUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GatewayUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { gatewayUser?: GatewayUser }).gatewayUser;
    if (!user) {
      throw new Error('GatewayUser is missing. Did you forget GatewayAuthGuard?');
    }
    return user;
  },
);
