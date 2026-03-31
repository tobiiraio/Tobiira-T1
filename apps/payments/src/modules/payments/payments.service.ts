import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsRepository } from './payments.repository';
import { EventPublisher } from '../../rabbitmq/event-publisher.service';
import { PaymentsEvents } from '@tobiira/common';
import type { PaymentDocument } from './schemas/payment.schema';
import type { RecordPaymentDto } from './dto/record-payment.dto';
import type { VoidPaymentDto } from './dto/void-payment.dto';
import type { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

function mapPayment(p: PaymentDocument) {
  return {
    id: String(p._id),
    organizationId: String(p.organizationId),
    resourceType: p.resourceType,
    resourceId: p.resourceId,
    payerId: String(p.payerId),
    payerEmail: p.payerEmail,
    payerName: p.payerName,
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    reference: p.reference,
    periodCovered: p.periodCovered
      ? { from: p.periodCovered.from.toISOString(), to: p.periodCovered.to.toISOString() }
      : null,
    paidAt: p.paidAt.toISOString(),
    notes: p.notes,
    recordedByUserId: String(p.recordedByUserId),
    source: p.source,
    status: p.status,
    voidedAt: p.voidedAt?.toISOString() ?? null,
    voidedByUserId: p.voidedByUserId ? String(p.voidedByUserId) : null,
    voidReason: p.voidReason,
    createdAt: (p as any).createdAt?.toISOString(),
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async recordPayment(params: {
    organizationId: string;
    recordedByUserId: string;
    dto: RecordPaymentDto;
  }) {
    const payment = await this.paymentsRepository.create({
      organizationId: params.organizationId,
      resourceType: params.dto.resourceType,
      resourceId: params.dto.resourceId,
      payerId: params.dto.payerId,
      payerEmail: params.dto.payerEmail,
      payerName: params.dto.payerName,
      amount: params.dto.amount,
      currency: params.dto.currency,
      method: params.dto.method,
      reference: params.dto.reference,
      periodCovered: params.dto.periodCovered
        ? { from: new Date(params.dto.periodCovered.from), to: new Date(params.dto.periodCovered.to) }
        : undefined,
      paidAt: new Date(params.dto.paidAt),
      notes: params.dto.notes,
      recordedByUserId: params.recordedByUserId,
    });

    this.eventPublisher.emit(PaymentsEvents.PAYMENT_RECORDED, {
      paymentId: String(payment._id),
      organizationId: params.organizationId,
      resourceType: params.dto.resourceType,
      resourceId: params.dto.resourceId,
      payerId: params.dto.payerId,
      payerEmail: params.dto.payerEmail,
      payerName: params.dto.payerName,
      amount: params.dto.amount,
      currency: params.dto.currency,
      method: params.dto.method,
      source: 'manual',
      periodFrom: params.dto.periodCovered?.from,
      periodTo: params.dto.periodCovered?.to,
      paidAt: params.dto.paidAt,
    });

    return mapPayment(payment);
  }

  async voidPayment(params: {
    paymentId: string;
    organizationId: string;
    voidedByUserId: string;
    dto: VoidPaymentDto;
  }) {
    const payment = await this.paymentsRepository.findById(params.paymentId);
    if (!payment || String(payment.organizationId) !== params.organizationId) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status === 'voided') {
      throw new BadRequestException('Payment is already voided');
    }

    const voided = await this.paymentsRepository.void({
      id: params.paymentId,
      voidedByUserId: params.voidedByUserId,
      voidedAt: new Date(),
      voidReason: params.dto.reason,
    });

    if (!voided) throw new NotFoundException('Payment not found or already voided');

    this.eventPublisher.emit(PaymentsEvents.PAYMENT_VOIDED, {
      paymentId: String(voided._id),
      organizationId: params.organizationId,
      resourceType: voided.resourceType,
      resourceId: voided.resourceId,
      payerId: String(voided.payerId),
      payerEmail: voided.payerEmail,
      amount: voided.amount,
      currency: voided.currency,
    });

    return mapPayment(voided);
  }

  async getPayment(params: { paymentId: string; organizationId: string }) {
    const payment = await this.paymentsRepository.findById(params.paymentId);
    if (!payment || String(payment.organizationId) !== params.organizationId) {
      throw new NotFoundException('Payment not found');
    }
    return mapPayment(payment);
  }

  // Internal — no organization scoping, used by documents service
  async getPaymentInternal(paymentId: string) {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    return mapPayment(payment);
  }

  async listPayments(params: {
    organizationId: string;
    query: ListPaymentsQueryDto;
  }) {
    // If resourceType + resourceId are both provided, use the targeted index
    if (params.query.resourceType && params.query.resourceId) {
      const payments = await this.paymentsRepository.findByResource(
        {
          organizationId: params.organizationId,
          resourceType: params.query.resourceType,
          resourceId: params.query.resourceId,
        },
        { limit: params.query.limit ?? 50, offset: params.query.offset ?? 0 },
      );
      return { items: payments.map(mapPayment) };
    }

    const payments = await this.paymentsRepository.findByOrganization(
      params.organizationId,
      {
        status: params.query.status,
        payerId: params.query.payerId,
        resourceType: params.query.resourceType,
      },
      { limit: params.query.limit ?? 50, offset: params.query.offset ?? 0 },
    );
    return { items: payments.map(mapPayment) };
  }
}
