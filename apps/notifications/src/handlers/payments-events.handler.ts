import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  PaymentsEvents,
  PaymentRecordedPayload,
  PaymentVoidedPayload,
} from '@tobiira/common';
import { EmailService } from '../channels/email/email.service';

@Controller()
export class PaymentsEventsHandler {
  private readonly logger = new Logger(PaymentsEventsHandler.name);

  constructor(private readonly emailService: EmailService) {}

  @EventPattern(PaymentsEvents.PAYMENT_RECORDED)
  async onPaymentRecorded(@Payload() payload: PaymentRecordedPayload) {
    try {
      await this.emailService.sendPaymentRecordedEmail({
        email: payload.payerEmail,
        payerName: payload.payerName,
        amount: payload.amount,
        currency: payload.currency,
        method: payload.method,
        periodFrom: payload.periodFrom,
        periodTo: payload.periodTo,
        paidAt: payload.paidAt,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send payment recorded email to ${payload.payerEmail}`);
    }
  }

  @EventPattern(PaymentsEvents.PAYMENT_VOIDED)
  async onPaymentVoided(@Payload() payload: PaymentVoidedPayload) {
    this.logger.log(
      `Payment ${payload.paymentId} voided for payer ${payload.payerEmail} (${payload.currency} ${payload.amount})`,
    );
  }
}
