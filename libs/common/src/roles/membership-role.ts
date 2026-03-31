export const MEMBERSHIP_ROLES = ['owner', 'operator', 'occupant'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];
