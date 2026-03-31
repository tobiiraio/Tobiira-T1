import { IsString, IsNotEmpty } from 'class-validator';

export class EnrollTenantDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
