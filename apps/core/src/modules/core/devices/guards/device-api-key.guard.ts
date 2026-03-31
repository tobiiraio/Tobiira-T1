import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { DevicesService } from '../devices.service';

export type DeviceContext = {
  deviceId: string;
  organizationId: string;
};

@Injectable()
export class DeviceApiKeyGuard implements CanActivate {
  constructor(private readonly devicesService: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-device-api-key'];

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new UnauthorizedException('Missing x-device-api-key header');
    }

    const device = await this.devicesService.authenticateDevice(apiKey);
    (request as Request & { device: DeviceContext }).device = device;
    return true;
  }
}
