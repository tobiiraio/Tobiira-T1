export const SYSTEM_ROLES = ['system_admin'] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
