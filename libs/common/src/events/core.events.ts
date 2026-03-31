export const CoreEvents = {
  AUTH_OTP_REQUESTED: 'core.auth.otp_requested',
  USER_CREATED: 'core.user.created',
  ORG_CREATED: 'core.org.created',
  MEMBERSHIP_INVITED: 'core.membership.invited',
  MEMBERSHIP_CREATED: 'core.membership.created',
  MEMBERSHIP_REMOVED: 'core.membership.removed',
  JOIN_REQUEST_RECEIVED: 'core.join_request.received',
  JOIN_REQUEST_APPROVED: 'core.join_request.approved',
  JOIN_REQUEST_REJECTED: 'core.join_request.rejected',
} as const;

export type CoreEvent = (typeof CoreEvents)[keyof typeof CoreEvents];

// --- Payloads ---

export interface OtpRequestedPayload {
  email: string;
  code: string;
  ttlMinutes: number;
}

export interface UserCreatedPayload {
  userId: string;
  email: string;
}

export interface OrgCreatedPayload {
  organizationId: string;
  organizationName: string;
  ownerEmail: string;
}

export interface MembershipInvitedPayload {
  email: string;
  organizationId: string;
  role: string;
  token: string;
  expiresAt: string;
}

export interface MembershipCreatedPayload {
  userId: string;
  organizationId: string;
  role: string;
}

export interface MembershipRemovedPayload {
  userId: string;
  organizationId: string;
}

export interface JoinRequestReceivedPayload {
  requestId: string;
  organizationId: string;
  userEmail: string;
  ownerEmail: string;
  organizationName: string;
  message?: string;
}

export interface JoinRequestResolvedPayload {
  requestId: string;
  organizationId: string;
  userEmail: string;
  decision: 'approved' | 'rejected';
}
