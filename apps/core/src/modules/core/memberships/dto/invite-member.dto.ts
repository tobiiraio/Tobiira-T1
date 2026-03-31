import { IsBoolean, IsEmail, IsIn, IsOptional } from 'class-validator';
import { MEMBERSHIP_ROLES, STAFF_ROLES } from '@tobiira/common';
import type { MembershipRole, StaffRole } from '@tobiira/common';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsIn(MEMBERSHIP_ROLES)
  role: MembershipRole;

  // Required when role === 'operator', ignored otherwise
  @IsOptional()
  @IsIn(STAFF_ROLES)
  staffRole?: StaffRole;

  // Set to true for property management companies acting on behalf of the owner
  @IsOptional()
  @IsBoolean()
  isManagingAgent?: boolean;
}
