import { IsOptional, IsString } from 'class-validator';

export class TerminateLeaseDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
