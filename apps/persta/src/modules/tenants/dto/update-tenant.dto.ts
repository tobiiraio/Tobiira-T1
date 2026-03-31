import { IsString, IsOptional, IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { IdType } from '../schemas/tenant.schema';

class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsEnum(['national_id', 'passport', 'driving_license', 'other'])
  idType?: IdType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}
