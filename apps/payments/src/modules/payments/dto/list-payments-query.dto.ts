import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PAYMENT_STATUSES, PaymentStatus } from '../schemas/payment.schema';

export class ListPaymentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  payerId?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;
}
