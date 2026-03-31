import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { DevicesRepository } from './devices.repository';

const hashKey = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class DevicesService {
  constructor(private readonly devicesRepository: DevicesRepository) {}

  async registerDevice(params: {
    organizationId: string;
    name: string;
    hardwareId?: string;
  }): Promise<{ id: string; apiKey: string; name: string; hardwareId?: string }> {
    const apiKey = randomBytes(32).toString('hex');
    const keyHash = hashKey(apiKey);

    const device = await this.devicesRepository.create({
      organizationId: params.organizationId,
      name: params.name,
      hardwareId: params.hardwareId,
      keyHash,
    });

    return {
      id: String(device._id),
      apiKey, // returned once — never stored in plain text
      name: device.name,
      hardwareId: device.hardwareId,
    };
  }

  async listDevices(params: {
    organizationId: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      hardwareId?: string;
      isActive: boolean;
      lastSeenAt: string | null;
      createdAt: string;
    }>;
  }> {
    const devices = await this.devicesRepository.findByOrganizationId(
      params.organizationId,
      { limit: params.limit ?? 50, offset: params.offset ?? 0 },
    );

    return {
      items: devices.map((d) => ({
        id: String(d._id),
        name: d.name,
        hardwareId: d.hardwareId,
        isActive: d.isActive,
        lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
        createdAt: (d as any).createdAt.toISOString(),
      })),
    };
  }

  async revokeDevice(params: {
    organizationId: string;
    deviceId: string;
  }): Promise<void> {
    const device = await this.devicesRepository.findById(params.deviceId);
    if (!device || String(device.organizationId) !== params.organizationId) {
      throw new NotFoundException('Device not found');
    }
    await this.devicesRepository.revoke(params.deviceId, new Date());
  }

  async authenticateDevice(
    apiKey: string,
  ): Promise<{ deviceId: string; organizationId: string }> {
    const keyHash = hashKey(apiKey.trim());
    const device = await this.devicesRepository.findByKeyHash(keyHash);
    if (!device) {
      throw new UnauthorizedException('Invalid device API key');
    }

    // fire-and-forget last seen update
    void this.devicesRepository.touchLastSeen(keyHash, new Date());

    return {
      deviceId: String(device._id),
      organizationId: String(device.organizationId),
    };
  }
}
