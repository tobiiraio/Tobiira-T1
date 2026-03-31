import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import type { PaymentFrequency } from '../schemas/unit.schema';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  blockId?: string;

  @IsNumber()
  @IsPositive()
  rentAmount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsEnum(['monthly', 'weekly', 'quarterly'])
  paymentFrequency: PaymentFrequency;

  @IsOptional()
  @IsNumber()
  floorNumber?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sizeSqm?: number;
}
