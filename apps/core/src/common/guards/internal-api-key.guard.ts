import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_HEADERS } from '@tobiira/common';
import type { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('INTERNAL_API_KEY');
    if (!expected) throw new UnauthorizedException('Internal API key not configured');

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[INTERNAL_HEADERS.API_KEY];

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return true;
  }
}
