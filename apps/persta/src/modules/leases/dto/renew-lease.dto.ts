import { IsDateString, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class RenewLeaseDto {
  @IsDateString()
  newEndDate: string;

  // Optional — if omitted, rent amount stays the same
  @IsOptional()
  @IsNumber()
  @IsPositive()
  rentAmount?: number;
}
