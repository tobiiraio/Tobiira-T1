export const NOTIFICATION_USE_CASES = [
  'auth.otp',
  'system.welcome',
  'organizations.created',
  'organizations.invite',
] as const;

export type NotificationUseCase = (typeof NOTIFICATION_USE_CASES)[number];
