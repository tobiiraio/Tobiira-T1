import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import type { CurrentUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization?.trim();

    if (!authorization?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Missing Authorization bearer token');
    }

    const accessToken = authorization.slice('bearer '.length).trim();
    if (!accessToken) {
      throw new UnauthorizedException('Missing Authorization bearer token');
    }

    const user =
      await this.authService.getSessionUserFromAccessToken(accessToken);
    (request as Request & { user: CurrentUser }).user = user;
    return true;
  }
}
