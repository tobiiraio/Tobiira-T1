export const PerstaEvents = {
  TENANT_ENROLLED: 'persta.tenant.enrolled',
  LEASE_CREATED: 'persta.lease.created',
  LEASE_ACTIVATED: 'persta.lease.activated',
  LEASE_TERMINATED: 'persta.lease.terminated',
  LEASE_RENEWED: 'persta.lease.renewed',
} as const;

export type PerstaEvent = (typeof PerstaEvents)[keyof typeof PerstaEvents];

export interface TenantEnrolledPayload {
  tenantId: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  organizationName: string;
}

export interface LeaseCreatedPayload {
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
}

export interface LeaseActivatedPayload {
  leaseId: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: string;
}

export interface LeaseTerminatedPayload {
  leaseId: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  terminatedAt: string;
  reason?: string;
}

export interface LeaseRenewedPayload {
  leaseId: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  newEndDate: string;
  rentAmount: number;
  currency: string;
}
