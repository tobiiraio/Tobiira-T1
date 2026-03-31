import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
} from 'class-validator';
import type { UnitStatus, PaymentFrequency } from '../schemas/unit.schema';

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  rentAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(['monthly', 'weekly', 'quarterly'])
  paymentFrequency?: PaymentFrequency;

  @IsOptional()
  @IsEnum(['vacant', 'occupied', 'maintenance'])
  status?: UnitStatus;

  @IsOptional()
  @IsNumber()
  floorNumber?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sizeSqm?: number;
}
