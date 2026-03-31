import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { INTERNAL_HEADERS } from '@tobiira/common';

export interface CoreUserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

@Injectable()
export class CoreClientService {
  private readonly logger = new Logger(CoreClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('CORE_SERVICE_URL') ?? 'http://localhost:6000';
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY') ?? '';
  }

  async getOrganizationName(organizationId: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ id: string; name: string }>(
          `${this.baseUrl}/api/v1/organizations/${organizationId}/internal`,
          { headers: { [INTERNAL_HEADERS.API_KEY]: this.apiKey } },
        ),
      );
      return response.data.name;
    } catch (err: any) {
      this.logger.error(err, `Failed to fetch org name for ${organizationId}`);
      return '';
    }
  }

  async createMembership(params: {
    organizationId: string;
    userId: string;
    role: 'occupant';
  }): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/organizations/${params.organizationId}/memberships/internal`,
          { userId: params.userId, role: params.role },
          { headers: { [INTERNAL_HEADERS.API_KEY]: this.apiKey } },
        ),
      );
    } catch (err: any) {
      this.logger.error(err, `Failed to create membership for user ${params.userId}`);
      throw err;
    }
  }

  async getUserProfile(userId: string): Promise<CoreUserProfile> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<CoreUserProfile>(
          `${this.baseUrl}/api/v1/users/${userId}`,
          { headers: { [INTERNAL_HEADERS.API_KEY]: this.apiKey } },
        ),
      );
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        throw new NotFoundException(`User ${userId} not found in core`);
      }
      this.logger.error(err, `Failed to fetch user profile for ${userId}`);
      throw err;
    }
  }
}
