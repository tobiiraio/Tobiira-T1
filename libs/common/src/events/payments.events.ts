export const PaymentsEvents = {
  PAYMENT_RECORDED: 'payments.payment.recorded',
  PAYMENT_VOIDED: 'payments.payment.voided',
} as const;

export type PaymentsEvent = (typeof PaymentsEvents)[keyof typeof PaymentsEvents];

// --- Payloads ---

export type PaymentRecordedPayload = {
  paymentId: string;
  organizationId: string;
  resourceType: string;
  resourceId: string;
  payerId: string;
  payerEmail: string;
  payerName?: string;
  amount: number;
  currency: string;
  method: string;
  source: string;
  periodFrom?: string;
  periodTo?: string;
  paidAt: string;
};

export type PaymentVoidedPayload = {
  paymentId: string;
  organizationId: string;
  resourceType: string;
  resourceId: string;
  payerId: string;
  payerEmail: string;
  amount: number;
  currency: string;
};
