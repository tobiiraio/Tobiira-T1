import { DocumentsService } from './documents.service';
import type { PdfService } from '../pdf/pdf.service';
import type { PerstaClientService } from '../internal-clients/persta-client.service';
import type { PaymentsClientService } from '../internal-clients/payments-client.service';
import type { ClientRmq } from '@nestjs/microservices';

const makePdfService = (overrides: Partial<PdfService> = {}): PdfService =>
  ({
    generatePaymentReceipt: jest.fn().mockResolvedValue(Buffer.from('receipt-pdf')),
    generateLeaseDocument: jest.fn().mockResolvedValue(Buffer.from('lease-pdf')),
    ...overrides,
  }) as unknown as PdfService;

const makePerstaClient = (overrides: Partial<PerstaClientService> = {}): PerstaClientService =>
  ({
    getLease: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as PerstaClientService;

const makePaymentsClient = (overrides: Partial<PaymentsClientService> = {}): PaymentsClientService =>
  ({
    getPayment: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as PaymentsClientService;

const makeRmqClient = (): ClientRmq =>
  ({ emit: jest.fn().mockReturnValue({ subscribe: jest.fn() }) }) as unknown as ClientRmq;

const makePayment = (overrides: object = {}) => ({
  id: 'pay1',
  organizationId: 'org1',
  resourceType: 'lease',
  resourceId: 'lease1',
  payerId: 'u1',
  payerEmail: 'tenant@example.com',
  payerName: 'Alice Smith',
  amount: 1200,
  currency: 'KES',
  method: 'bank_transfer',
  reference: 'REF001',
  periodCovered: { from: '2025-01-01T00:00:00.000Z', to: '2025-01-31T00:00:00.000Z' },
  paidAt: '2025-01-05T00:00:00.000Z',
  status: 'recorded',
  ...overrides,
});

const makeLease = (overrides: object = {}) => ({
  id: 'lease1',
  organizationId: 'org1',
  unitId: 'unit1',
  tenantId: 'tenant1',
  tenantEmail: 'tenant@example.com',
  tenantName: 'Alice Smith',
  unitName: 'Unit 1A',
  propertyName: 'Sunrise Apartments',
  organizationName: 'Acme Corp',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2026-01-01'),
  rentAmount: 1200,
  currency: 'KES',
  paymentFrequency: 'monthly',
  depositAmount: 2400,
  status: 'active',
  ...overrides,
});

const makeService = (overrides: {
  pdf?: Partial<PdfService>;
  persta?: Partial<PerstaClientService>;
  payments?: Partial<PaymentsClientService>;
  rmq?: ClientRmq;
} = {}) =>
  new DocumentsService(
    makePdfService(overrides.pdf),
    makePerstaClient(overrides.persta),
    makePaymentsClient(overrides.payments),
    overrides.rmq ?? makeRmqClient(),
  );

// ── generateAndEmailReceipt ───────────────────────────────────────────────────

describe('DocumentsService.generateAndEmailReceipt', () => {
  it('fetches payment, generates PDF, and emits DOCUMENT_GENERATED', async () => {
    const generatePaymentReceipt = jest.fn().mockResolvedValue(Buffer.from('receipt'));
    const emit = jest.fn().mockReturnValue({ subscribe: jest.fn() });

    const service = makeService({
      payments: { getPayment: jest.fn().mockResolvedValue(makePayment()) },
      pdf: { generatePaymentReceipt },
      rmq: { emit } as unknown as ClientRmq,
    });

    await service.generateAndEmailReceipt('pay1');

    expect(generatePaymentReceipt).toHaveBeenCalledTimes(1);
    expect(generatePaymentReceipt).toHaveBeenCalledWith(expect.objectContaining({
      paymentId: 'pay1',
      amount: 1200,
      currency: 'KES',
    }));
    expect(emit).toHaveBeenCalledTimes(1);
    const [event, payload] = emit.mock.calls[0];
    expect(event).toBe('documents.document.generated');
    expect(payload.documentType).toBe('receipt');
    expect(payload.recipientEmail).toBe('tenant@example.com');
    expect(typeof payload.pdfBase64).toBe('string');
    expect(Buffer.from(payload.pdfBase64, 'base64').toString()).toBe('receipt');
  });

  it('skips generation when payment not found', async () => {
    const generatePaymentReceipt = jest.fn();
    const service = makeService({ pdf: { generatePaymentReceipt } });

    await service.generateAndEmailReceipt('nope');

    expect(generatePaymentReceipt).not.toHaveBeenCalled();
  });
});

// ── generateAndEmailLeaseDocument ────────────────────────────────────────────

describe('DocumentsService.generateAndEmailLeaseDocument', () => {
  it('fetches lease, generates PDF, and emits DOCUMENT_GENERATED', async () => {
    const generateLeaseDocument = jest.fn().mockResolvedValue(Buffer.from('lease'));
    const emit = jest.fn().mockReturnValue({ subscribe: jest.fn() });

    const service = makeService({
      persta: { getLease: jest.fn().mockResolvedValue(makeLease()) },
      pdf: { generateLeaseDocument },
      rmq: { emit } as unknown as ClientRmq,
    });

    await service.generateAndEmailLeaseDocument('lease1');

    expect(generateLeaseDocument).toHaveBeenCalledTimes(1);
    expect(generateLeaseDocument).toHaveBeenCalledWith(expect.objectContaining({
      leaseId: 'lease1',
      tenantName: 'Alice Smith',
      organizationName: 'Acme Corp',
    }));
    expect(emit).toHaveBeenCalledTimes(1);
    const [event, payload] = emit.mock.calls[0];
    expect(event).toBe('documents.document.generated');
    expect(payload.documentType).toBe('lease');
    expect(payload.recipientEmail).toBe('tenant@example.com');
  });

  it('skips generation when lease not found', async () => {
    const generateLeaseDocument = jest.fn();
    const service = makeService({ pdf: { generateLeaseDocument } });

    await service.generateAndEmailLeaseDocument('nope');

    expect(generateLeaseDocument).not.toHaveBeenCalled();
  });
});

// ── generateLeaseDocumentBuffer ───────────────────────────────────────────────

describe('DocumentsService.generateLeaseDocumentBuffer', () => {
  it('returns buffer and fileName when lease exists', async () => {
    const service = makeService({
      persta: { getLease: jest.fn().mockResolvedValue(makeLease()) },
      pdf: { generateLeaseDocument: jest.fn().mockResolvedValue(Buffer.from('lease-pdf')) },
    });

    const result = await service.generateLeaseDocumentBuffer('lease1');

    expect(result).not.toBeNull();
    expect(result!.fileName).toBe('lease-lease1.pdf');
    expect(result!.buffer.toString()).toBe('lease-pdf');
  });

  it('returns null when lease not found', async () => {
    const service = makeService();
    const result = await service.generateLeaseDocumentBuffer('nope');
    expect(result).toBeNull();
  });
});

// ── generateReceiptBuffer ─────────────────────────────────────────────────────

describe('DocumentsService.generateReceiptBuffer', () => {
  it('returns buffer and fileName when payment exists', async () => {
    const service = makeService({
      payments: { getPayment: jest.fn().mockResolvedValue(makePayment()) },
      pdf: { generatePaymentReceipt: jest.fn().mockResolvedValue(Buffer.from('receipt-pdf')) },
    });

    const result = await service.generateReceiptBuffer('pay1');

    expect(result).not.toBeNull();
    expect(result!.fileName).toBe('receipt-pay1.pdf');
    expect(result!.buffer.toString()).toBe('receipt-pdf');
  });

  it('returns null when payment not found', async () => {
    const service = makeService();
    const result = await service.generateReceiptBuffer('nope');
    expect(result).toBeNull();
  });
});
