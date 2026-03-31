import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface PaymentReceiptData {
  paymentId: string;
  organizationName: string;
  payerName?: string;
  payerEmail: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  periodFrom?: string;
  periodTo?: string;
  paidAt: string;
  resourceType: string;
  resourceId: string;
}

export interface LeaseDocumentData {
  leaseId: string;
  organizationName: string;
  tenantName?: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: string;
  paymentFrequency: string;
  depositAmount?: number;
}

@Injectable()
export class PdfService {
  generatePaymentReceipt(data: PaymentReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Payment Receipt', { align: 'center' });
      doc.fontSize(10).text(data.organizationName, { align: 'center' });
      doc.moveDown(2);

      // Receipt details
      doc.fontSize(12).text(`Receipt ID: ${data.paymentId}`);
      doc.text(`Date: ${data.paidAt}`);
      doc.moveDown();

      doc.text(`Payer: ${data.payerName ?? data.payerEmail}`);
      doc.text(`Email: ${data.payerEmail}`);
      doc.moveDown();

      doc.fontSize(14).text(`Amount: ${data.currency} ${data.amount}`);
      doc.fontSize(12).text(`Method: ${data.method}`);
      if (data.reference) doc.text(`Reference: ${data.reference}`);
      if (data.periodFrom && data.periodTo) {
        doc.text(`Period: ${data.periodFrom} – ${data.periodTo}`);
      }
      doc.moveDown();

      doc.fontSize(10).fillColor('grey').text(`Resource: ${data.resourceType} / ${data.resourceId}`);

      doc.end();
    });
  }

  generateLeaseDocument(data: LeaseDocumentData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Lease Agreement', { align: 'center' });
      doc.fontSize(10).text(data.organizationName, { align: 'center' });
      doc.moveDown(2);

      // Parties
      doc.fontSize(14).text('Parties');
      doc.fontSize(12)
        .text(`Landlord / Manager: ${data.organizationName}`)
        .text(`Tenant: ${data.tenantName ?? data.tenantEmail}`)
        .text(`Tenant Email: ${data.tenantEmail}`);
      doc.moveDown();

      // Property
      doc.fontSize(14).text('Property');
      doc.fontSize(12)
        .text(`Property: ${data.propertyName}`)
        .text(`Unit: ${data.unitName}`);
      doc.moveDown();

      // Terms
      doc.fontSize(14).text('Lease Terms');
      doc.fontSize(12)
        .text(`Start Date: ${data.startDate}`)
        .text(`End Date: ${data.endDate}`)
        .text(`Rent: ${data.currency} ${data.rentAmount} (${data.paymentFrequency})`);
      if (data.depositAmount) doc.text(`Security Deposit: ${data.currency} ${data.depositAmount}`);
      doc.moveDown(2);

      doc.fontSize(10).fillColor('grey')
        .text(`Lease ID: ${data.leaseId}`)
        .text('This document is computer-generated.');

      doc.end();
    });
  }
}
