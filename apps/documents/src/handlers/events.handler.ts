import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  PaymentsEvents,
  PaymentRecordedPayload,
  PerstaEvents,
  LeaseActivatedPayload,
  LeaseRenewedPayload,
} from '@tobiira/common';
import { DocumentsService } from '../documents/documents.service';

@Controller()
export class EventsHandler {
  private readonly logger = new Logger(EventsHandler.name);

  constructor(private readonly documentsService: DocumentsService) {}

  @EventPattern(PaymentsEvents.PAYMENT_RECORDED)
  async onPaymentRecorded(@Payload() payload: PaymentRecordedPayload) {
    try {
      // Fetch full record from payments service, generate PDF in memory, and email it
      await this.documentsService.generateAndEmailReceipt(payload.paymentId);
    } catch (err) {
      this.logger.error(err, `Failed to generate receipt for payment ${payload.paymentId}`);
    }
  }

  @EventPattern(PerstaEvents.LEASE_ACTIVATED)
  async onLeaseActivated(@Payload() payload: LeaseActivatedPayload) {
    try {
      // Fetch full record from persta service, generate PDF in memory, and email it
      await this.documentsService.generateAndEmailLeaseDocument(payload.leaseId);
    } catch (err) {
      this.logger.error(err, `Failed to generate lease doc for lease ${payload.leaseId}`);
    }
  }

  @EventPattern(PerstaEvents.LEASE_RENEWED)
  async onLeaseRenewed(@Payload() payload: LeaseRenewedPayload) {
    try {
      // Re-generate lease document with updated end date and email it
      await this.documentsService.generateAndEmailLeaseDocument(payload.leaseId);
    } catch (err) {
      this.logger.error(err, `Failed to generate renewed lease doc for lease ${payload.leaseId}`);
    }
  }
}
