// Functional sub-roles for operators (landlord staff or property management agency staff).
// Only meaningful when membership.role === 'operator'.
export const STAFF_ROLES = ['supervisor', 'maintenance', 'finance', 'general'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
