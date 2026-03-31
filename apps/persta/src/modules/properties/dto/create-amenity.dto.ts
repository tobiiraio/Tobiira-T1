import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsPositive } from 'class-validator';
import type { AmenityLevel } from '../schemas/amenity.schema';

export class CreateAmenityDto {
  @IsEnum(['property', 'block', 'unit'])
  level: AmenityLevel;

  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacity?: number;
}
