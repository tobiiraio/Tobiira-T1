export const PerstaEvents = {
  TENANT_ENROLLED: 'persta.tenant.enrolled',
  LEASE_CREATED: 'persta.lease.created',
  LEASE_ACTIVATED: 'persta.lease.activated',
  LEASE_TERMINATED: 'persta.lease.terminated',
  LEASE_RENEWED: 'persta.lease.renewed',
} as const;

export type PerstaEvent = (typeof PerstaEvents)[keyof typeof PerstaEvents];

export type TenantEnrolledPayload = {
  tenantId: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  organizationName: string;
};

export type LeaseCreatedPayload = {
  leaseId: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: string;
  paymentFrequency: string;
};

export type LeaseActivatedPayload = {
  leaseId: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: string;
};

export type LeaseTerminatedPayload = {
  leaseId: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  terminatedAt: string;
  reason?: string;
};

export type LeaseRenewedPayload = {
  leaseId: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  newEndDate: string;
  rentAmount: number;
  currency: string;
};
