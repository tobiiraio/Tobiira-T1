export const NOTIFICATION_CATEGORIES = [
  'auth',
  'organizations',
  'payments',
  'system',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
