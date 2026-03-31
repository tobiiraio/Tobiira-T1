import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { INTERNAL_HEADERS } from '@tobiira/common';

export interface FullLeaseRecord {
  id: string;
  organizationId: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: string;
  paymentFrequency: string;
  depositAmount?: number;
  status: string;
  tenantEmail: string;
  tenantName?: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
}

@Injectable()
export class PerstaClientService {
  private readonly logger = new Logger(PerstaClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('PERSTA_SERVICE_URL') ?? 'http://localhost:7000';
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY') ?? '';
  }

  async getLease(leaseId: string): Promise<FullLeaseRecord | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<FullLeaseRecord>(
          `${this.baseUrl}/api/v1/leases/${leaseId}/internal`,
          { headers: { [INTERNAL_HEADERS.API_KEY]: this.apiKey } },
        ),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(err, `Failed to fetch lease ${leaseId} from persta`);
      return null;
    }
  }
}
