import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBlockDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
