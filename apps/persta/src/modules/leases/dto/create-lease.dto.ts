import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateLeaseDto {
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  // optional — defaults to unit's listed rentAmount
  @IsOptional()
  @IsNumber()
  @IsPositive()
  rentAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;
}
