export const RABBITMQ_EXCHANGES = {
  CORE: 'tobiira.core',
  PERSTA: 'tobiira.persta',
} as const;

export const RABBITMQ_QUEUES = {
  NOTIFICATIONS_CORE: 'notifications.core',
  NOTIFICATIONS_PERSTA: 'notifications.persta',
  NOTIFICATIONS_PAYMENTS: 'notifications.payments',
  DOCUMENTS_EVENTS: 'documents.events',
} as const;
