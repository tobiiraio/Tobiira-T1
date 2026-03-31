import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import type { PropertyType } from '../schemas/property.schema';

class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsEnum(['residential', 'commercial', 'mixed'])
  type: PropertyType;
}
