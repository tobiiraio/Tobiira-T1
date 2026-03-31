import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { INTERNAL_HEADERS } from '@tobiira/common';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers[INTERNAL_HEADERS.API_KEY];
    const keyValue = Array.isArray(key) ? key[0] : key;
    const expected = this.configService.get<string>('INTERNAL_API_KEY');

    if (!expected || keyValue !== expected) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
