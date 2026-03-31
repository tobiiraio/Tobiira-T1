import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  CoreEvents,
  OtpRequestedPayload,
  UserCreatedPayload,
  OrgCreatedPayload,
  MembershipInvitedPayload,
  JoinRequestReceivedPayload,
  JoinRequestResolvedPayload,
} from '@tobiira/common';
import { EmailService } from '../channels/email/email.service';

@Controller()
export class CoreEventsHandler {
  private readonly logger = new Logger(CoreEventsHandler.name);

  constructor(private readonly emailService: EmailService) {}

  @EventPattern(CoreEvents.AUTH_OTP_REQUESTED)
  async onOtpRequested(@Payload() payload: OtpRequestedPayload) {
    try {
      await this.emailService.sendAuthOtpEmail(payload);
    } catch (err) {
      this.logger.error(err, `Failed to send OTP email to ${payload.email}`);
    }
  }

  @EventPattern(CoreEvents.USER_CREATED)
  async onUserCreated(@Payload() payload: UserCreatedPayload) {
    try {
      await this.emailService.sendWelcomeEmail({ email: payload.email });
    } catch (err) {
      this.logger.error(err, `Failed to send welcome email to ${payload.email}`);
    }
  }

  @EventPattern(CoreEvents.ORG_CREATED)
  async onOrgCreated(@Payload() payload: OrgCreatedPayload) {
    try {
      await this.emailService.sendOrgCreatedEmail({
        email: payload.ownerEmail,
        organizationName: payload.organizationName,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send org created email to ${payload.ownerEmail}`);
    }
  }

  @EventPattern(CoreEvents.MEMBERSHIP_INVITED)
  async onMembershipInvited(@Payload() payload: MembershipInvitedPayload) {
    try {
      await this.emailService.sendOrgInviteEmail(payload);
    } catch (err) {
      this.logger.error(err, `Failed to send invite email to ${payload.email}`);
    }
  }

  @EventPattern(CoreEvents.JOIN_REQUEST_RECEIVED)
  async onJoinRequestReceived(@Payload() payload: JoinRequestReceivedPayload) {
    if (!payload.ownerEmail) {
      this.logger.warn(`No owner email for join request ${payload.requestId}, skipping notification`);
      return;
    }
    try {
      await this.emailService.sendJoinRequestReceivedEmail({
        toEmail: payload.ownerEmail,
        userEmail: payload.userEmail,
        organizationName: payload.organizationName,
        message: payload.message,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send join request notification to ${payload.ownerEmail}`);
    }
  }

  @EventPattern(CoreEvents.JOIN_REQUEST_APPROVED)
  async onJoinRequestApproved(@Payload() payload: JoinRequestResolvedPayload) {
    try {
      await this.emailService.sendJoinRequestResolvedEmail({
        email: payload.userEmail,
        decision: 'approved',
        organizationName: payload.organizationId, // fallback to id until we resolve name
      });
    } catch (err) {
      this.logger.error(err, `Failed to send join request approved email to ${payload.userEmail}`);
    }
  }

  @EventPattern(CoreEvents.JOIN_REQUEST_REJECTED)
  async onJoinRequestRejected(@Payload() payload: JoinRequestResolvedPayload) {
    try {
      await this.emailService.sendJoinRequestResolvedEmail({
        email: payload.userEmail,
        decision: 'rejected',
        organizationName: payload.organizationId,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send join request rejected email to ${payload.userEmail}`);
    }
  }
}
