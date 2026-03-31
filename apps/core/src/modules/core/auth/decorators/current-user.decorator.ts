import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type CurrentUser = {
  userId: string;
  email: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CurrentUser }).user;
    if (!user) {
      throw new Error('CurrentUser is missing. Did you forget JwtAccessGuard?');
    }
    return user;
  },
);
