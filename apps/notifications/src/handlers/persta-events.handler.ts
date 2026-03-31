import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  PerstaEvents,
  TenantEnrolledPayload,
  LeaseCreatedPayload,
  LeaseActivatedPayload,
  LeaseTerminatedPayload,
  LeaseRenewedPayload,
} from '@tobiira/common';
import { EmailService } from '../channels/email/email.service';

@Controller()
export class PerstaEventsHandler {
  private readonly logger = new Logger(PerstaEventsHandler.name);

  constructor(private readonly emailService: EmailService) {}

  @EventPattern(PerstaEvents.TENANT_ENROLLED)
  async onTenantEnrolled(@Payload() payload: TenantEnrolledPayload) {
    try {
      await this.emailService.sendTenantEnrolledEmail({
        email: payload.email,
        firstName: payload.firstName,
        organizationName: payload.organizationName,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send tenant enrolled email to ${payload.email}`);
    }
  }

  @EventPattern(PerstaEvents.LEASE_CREATED)
  async onLeaseCreated(@Payload() payload: LeaseCreatedPayload) {
    try {
      await this.emailService.sendLeaseCreatedEmail({
        email: payload.tenantEmail,
        unitName: payload.unitName,
        propertyName: payload.propertyName,
        organizationName: payload.organizationName,
        startDate: payload.startDate,
        endDate: payload.endDate,
        rentAmount: payload.rentAmount,
        currency: payload.currency,
        paymentFrequency: payload.paymentFrequency,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send lease created email to ${payload.tenantEmail}`);
    }
  }

  @EventPattern(PerstaEvents.LEASE_ACTIVATED)
  async onLeaseActivated(@Payload() payload: LeaseActivatedPayload) {
    try {
      await this.emailService.sendLeaseActivatedEmail({
        email: payload.tenantEmail,
        unitName: payload.unitName,
        propertyName: payload.propertyName,
        organizationName: payload.organizationName,
        startDate: payload.startDate,
        endDate: payload.endDate,
        rentAmount: payload.rentAmount,
        currency: payload.currency,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send lease activated email to ${payload.tenantEmail}`);
    }
  }

  @EventPattern(PerstaEvents.LEASE_TERMINATED)
  async onLeaseTerminated(@Payload() payload: LeaseTerminatedPayload) {
    try {
      await this.emailService.sendLeaseTerminatedEmail({
        email: payload.tenantEmail,
        unitName: payload.unitName,
        propertyName: payload.propertyName,
        organizationName: payload.organizationName,
        terminatedAt: payload.terminatedAt,
        reason: payload.reason,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send lease terminated email to ${payload.tenantEmail}`);
    }
  }

  @EventPattern(PerstaEvents.LEASE_RENEWED)
  async onLeaseRenewed(@Payload() payload: LeaseRenewedPayload) {
    try {
      await this.emailService.sendLeaseRenewedEmail({
        email: payload.tenantEmail,
        unitName: payload.unitName,
        propertyName: payload.propertyName,
        organizationName: payload.organizationName,
        newEndDate: payload.newEndDate,
        rentAmount: payload.rentAmount,
        currency: payload.currency,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send lease renewed email to ${payload.tenantEmail}`);
    }
  }
}
