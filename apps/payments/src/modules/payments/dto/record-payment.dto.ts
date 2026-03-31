import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PAYMENT_METHODS, PaymentMethod } from '../schemas/payment.schema';

export class PeriodCoveredDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class RecordPaymentDto {
  // What vertical resource this payment is for (e.g. 'lease', 'booking', 'subscription')
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  // ID of the resource in its originating service
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  // The user who made the payment
  @IsString()
  @IsNotEmpty()
  payerId: string;

  @IsEmail()
  payerEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  payerName?: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsIn(PAYMENT_METHODS)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  // Optional period this payment covers (e.g. rent month)
  @IsOptional()
  @ValidateNested()
  @Type(() => PeriodCoveredDto)
  periodCovered?: PeriodCoveredDto;

  @IsDateString()
  paidAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
