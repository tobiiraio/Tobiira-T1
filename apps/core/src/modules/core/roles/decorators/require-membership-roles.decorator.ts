import { SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '../membership-role';

export const REQUIRED_MEMBERSHIP_ROLES_KEY = 'required_membership_roles';

export const RequireMembershipRoles = (...roles: MembershipRole[]) =>
  SetMetadata(REQUIRED_MEMBERSHIP_ROLES_KEY, roles);
