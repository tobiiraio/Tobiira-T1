import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { DeviceContext } from '../guards/device-api-key.guard';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DeviceContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const device = (request as Request & { device?: DeviceContext }).device;
    if (!device) {
      throw new Error('CurrentDevice is missing. Did you forget DeviceApiKeyGuard?');
    }
    return device;
  },
);
