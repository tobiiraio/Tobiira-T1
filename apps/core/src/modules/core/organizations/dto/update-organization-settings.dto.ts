import { IsISO31661Alpha2, IsLocale, IsOptional, IsString, IsTimeZone } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsISO31661Alpha2()
  currency?: string;

  @IsOptional()
  @IsLocale()
  locale?: string;
}
