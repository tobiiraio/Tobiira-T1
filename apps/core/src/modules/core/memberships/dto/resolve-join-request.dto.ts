import { IsIn } from 'class-validator';

export class ResolveJoinRequestDto {
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';
}
