import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientRmq } from '@nestjs/microservices';
import { PdfService } from '../pdf/pdf.service';
import { PerstaClientService } from '../internal-clients/persta-client.service';
import { PaymentsClientService } from '../internal-clients/payments-client.service';
import { DocumentsEvents } from '@tobiira/common';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly perstaClient: PerstaClientService,
    private readonly paymentsClient: PaymentsClientService,
    @Inject(RABBITMQ_CLIENT) private readonly rmqClient: ClientRmq,
  ) {}

  // Fetch full payment record from payments service, generate PDF in memory, and email it.
  async generateAndEmailReceipt(paymentId: string): Promise<void> {
    const payment = await this.paymentsClient.getPayment(paymentId);
    if (!payment) {
      this.logger.warn(`Payment ${paymentId} not found — skipping receipt generation`);
      return;
    }

    const buffer = await this.pdfService.generatePaymentReceipt({
      paymentId: payment.id,
      organizationName: payment.organizationId, // org name not in payment; use ID as fallback
      payerName: payment.payerName,
      payerEmail: payment.payerEmail,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      reference: payment.reference,
      periodFrom: payment.periodCovered?.from,
      periodTo: payment.periodCovered?.to,
      paidAt: payment.paidAt,
      resourceType: payment.resourceType,
      resourceId: payment.resourceId,
    });

    this.emitDocumentGenerated({
      documentType: 'receipt',
      pdfBase64: buffer.toString('base64'),
      recipientEmail: payment.payerEmail,
      recipientName: payment.payerName,
      organizationName: payment.organizationId,
      metadata: { paymentId: payment.id, resourceType: payment.resourceType },
    });
  }

  // Fetch full lease record from persta service, generate PDF in memory, and email it.
  async generateAndEmailLeaseDocument(leaseId: string): Promise<void> {
    const lease = await this.perstaClient.getLease(leaseId);
    if (!lease) {
      this.logger.warn(`Lease ${leaseId} not found — skipping lease document generation`);
      return;
    }

    const buffer = await this.pdfService.generateLeaseDocument({
      leaseId: lease.id,
      organizationName: lease.organizationName,
      tenantName: lease.tenantName,
      tenantEmail: lease.tenantEmail,
      unitName: lease.unitName,
      propertyName: lease.propertyName,
      startDate: lease.startDate,
      endDate: lease.endDate,
      rentAmount: lease.rentAmount,
      currency: lease.currency,
      paymentFrequency: lease.paymentFrequency,
      depositAmount: lease.depositAmount,
    });

    this.emitDocumentGenerated({
      documentType: 'lease',
      pdfBase64: buffer.toString('base64'),
      recipientEmail: lease.tenantEmail,
      recipientName: lease.tenantName,
      organizationName: lease.organizationName,
      metadata: { leaseId: lease.id },
    });
  }

  // On-demand PDF generation — returns buffer directly so the HTTP layer can stream it
  async generateLeaseDocumentBuffer(leaseId: string): Promise<{ buffer: Buffer; fileName: string } | null> {
    const lease = await this.perstaClient.getLease(leaseId);
    if (!lease) return null;

    const buffer = await this.pdfService.generateLeaseDocument({
      leaseId: lease.id,
      organizationName: lease.organizationName,
      tenantName: lease.tenantName,
      tenantEmail: lease.tenantEmail,
      unitName: lease.unitName,
      propertyName: lease.propertyName,
      startDate: lease.startDate,
      endDate: lease.endDate,
      rentAmount: lease.rentAmount,
      currency: lease.currency,
      paymentFrequency: lease.paymentFrequency,
      depositAmount: lease.depositAmount,
    });

    return { buffer, fileName: `lease-${leaseId}.pdf` };
  }

  async generateReceiptBuffer(paymentId: string): Promise<{ buffer: Buffer; fileName: string } | null> {
    const payment = await this.paymentsClient.getPayment(paymentId);
    if (!payment) return null;

    const buffer = await this.pdfService.generatePaymentReceipt({
      paymentId: payment.id,
      organizationName: payment.organizationId,
      payerName: payment.payerName,
      payerEmail: payment.payerEmail,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      reference: payment.reference,
      periodFrom: payment.periodCovered?.from,
      periodTo: payment.periodCovered?.to,
      paidAt: payment.paidAt,
      resourceType: payment.resourceType,
      resourceId: payment.resourceId,
    });

    return { buffer, fileName: `receipt-${paymentId}.pdf` };
  }

  private emitDocumentGenerated(params: {
    documentType: 'receipt' | 'lease' | 'other';
    pdfBase64: string;
    recipientEmail: string;
    recipientName?: string;
    organizationName: string;
    metadata: Record<string, string>;
  }) {
    this.rmqClient.emit(DocumentsEvents.DOCUMENT_GENERATED, params).subscribe({
      error: (err: unknown) => this.logger.error(err, 'Failed to emit DOCUMENT_GENERATED'),
    });
  }
}
