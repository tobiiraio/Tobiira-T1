import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { INTERNAL_HEADERS } from '@tobiira/common';

export interface FullPaymentRecord {
  id: string;
  organizationId: string;
  resourceType: string;
  resourceId: string;
  payerId: string;
  payerEmail: string;
  payerName?: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  periodCovered: { from: string; to: string } | null;
  paidAt: string;
  notes?: string;
  source: string;
  status: string;
}

@Injectable()
export class PaymentsClientService {
  private readonly logger = new Logger(PaymentsClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('PAYMENTS_SERVICE_URL') ?? 'http://localhost:6003';
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY') ?? '';
  }

  async getPayment(paymentId: string): Promise<FullPaymentRecord | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<FullPaymentRecord>(
          `${this.baseUrl}/api/v1/payments/${paymentId}/internal`,
          { headers: { [INTERNAL_HEADERS.API_KEY]: this.apiKey } },
        ),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(err, `Failed to fetch payment ${paymentId} from payments`);
      return null;
    }
  }
}
