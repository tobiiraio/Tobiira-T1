export const SYSTEM_ROLES = ['superadmin', 'support', 'user'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
