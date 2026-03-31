import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import type { PropertyType } from '../schemas/property.schema';

class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsEnum(['residential', 'commercial', 'mixed'])
  type?: PropertyType;
}
