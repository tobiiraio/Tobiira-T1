import { IsIn } from 'class-validator';
import {
  MEMBERSHIP_ROLES,
  type MembershipRole,
} from '../../roles/membership-role';

export class UpdateMemberRoleDto {
  @IsIn(MEMBERSHIP_ROLES)
  role: MembershipRole;
}
