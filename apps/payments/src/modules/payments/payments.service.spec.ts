import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { PaymentsRepository } from './payments.repository';
import type { EventPublisher } from '../../rabbitmq/event-publisher.service';
import type { PaymentDocument } from './schemas/payment.schema';

const makeRepo = (overrides: Partial<PaymentsRepository> = {}): PaymentsRepository =>
  ({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByResource: jest.fn().mockResolvedValue([]),
    findByOrganization: jest.fn().mockResolvedValue([]),
    void: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as PaymentsRepository;

const makePublisher = (): EventPublisher =>
  ({ emit: jest.fn() }) as unknown as EventPublisher;

const makePayment = (overrides: object = {}): PaymentDocument =>
  ({
    _id: 'p1',
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
    periodCovered: { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
    paidAt: new Date('2025-01-05'),
    notes: 'January rent',
    recordedByUserId: 'staff1',
    source: 'manual',
    status: 'recorded',
    voidedAt: null,
    voidedByUserId: null,
    voidReason: undefined,
    createdAt: new Date('2025-01-05'),
    ...overrides,
  }) as unknown as PaymentDocument;

const makeService = (
  repoOverrides: Partial<PaymentsRepository> = {},
  publisher?: EventPublisher,
) => new PaymentsService(makeRepo(repoOverrides), publisher ?? makePublisher());

// ── recordPayment ─────────────────────────────────────────────────────────────

describe('PaymentsService.recordPayment', () => {
  it('creates a payment and emits PAYMENT_RECORDED event', async () => {
    const payment = makePayment();
    const create = jest.fn().mockResolvedValue(payment);
    const emit = jest.fn();
    const service = makeService({ create }, { emit } as unknown as EventPublisher);

    const result = await service.recordPayment({
      organizationId: 'org1',
      recordedByUserId: 'staff1',
      dto: {
        resourceType: 'lease',
        resourceId: 'lease1',
        payerId: 'u1',
        payerEmail: 'tenant@example.com',
        amount: 1200,
        currency: 'KES',
        method: 'bank_transfer',
        paidAt: '2025-01-05T00:00:00.000Z',
      },
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    const [event] = emit.mock.calls[0];
    expect(event).toBe('payments.payment.recorded');
    expect(result.id).toBe('p1');
    expect(result.amount).toBe(1200);
  });

  it('maps periodCovered to ISO strings', async () => {
    const payment = makePayment();
    const service = makeService({ create: jest.fn().mockResolvedValue(payment) });

    const result = await service.recordPayment({
      organizationId: 'org1',
      recordedByUserId: 'staff1',
      dto: {
        resourceType: 'lease',
        resourceId: 'lease1',
        payerId: 'u1',
        payerEmail: 'tenant@example.com',
        amount: 1200,
        currency: 'KES',
        method: 'bank_transfer',
        paidAt: '2025-01-05T00:00:00.000Z',
        periodCovered: { from: '2025-01-01', to: '2025-01-31' },
      },
    });

    expect(result.periodCovered).not.toBeNull();
    expect(result.periodCovered!.from).toBe(new Date('2025-01-01').toISOString());
  });
});

// ── getPayment ────────────────────────────────────────────────────────────────

describe('PaymentsService.getPayment', () => {
  it('returns mapped payment when found and org matches', async () => {
    const service = makeService({
      findById: jest.fn().mockResolvedValue(makePayment()),
    });

    const result = await service.getPayment({ paymentId: 'p1', organizationId: 'org1' });
    expect(result.id).toBe('p1');
    expect(result.payerEmail).toBe('tenant@example.com');
  });

  it('throws NotFoundException when payment not found', async () => {
    const service = makeService();
    await expect(service.getPayment({ paymentId: 'nope', organizationId: 'org1' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when org does not match', async () => {
    const service = makeService({
      findById: jest.fn().mockResolvedValue(makePayment({ organizationId: 'other-org' })),
    });
    await expect(service.getPayment({ paymentId: 'p1', organizationId: 'org1' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ── getPaymentInternal ────────────────────────────────────────────────────────

describe('PaymentsService.getPaymentInternal', () => {
  it('returns payment without org check', async () => {
    const service = makeService({
      findById: jest.fn().mockResolvedValue(makePayment({ organizationId: 'any-org' })),
    });
    const result = await service.getPaymentInternal('p1');
    expect(result.id).toBe('p1');
  });

  it('throws NotFoundException when payment not found', async () => {
    const service = makeService();
    await expect(service.getPaymentInternal('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ── voidPayment ───────────────────────────────────────────────────────────────

describe('PaymentsService.voidPayment', () => {
  it('voids a recorded payment and emits PAYMENT_VOIDED', async () => {
    const voided = makePayment({ status: 'voided', voidedAt: new Date(), voidedByUserId: 'staff1' });
    const voidFn = jest.fn().mockResolvedValue(voided);
    const emit = jest.fn();
    const service = makeService(
      {
        findById: jest.fn().mockResolvedValue(makePayment()),
        void: voidFn,
      },
      { emit } as unknown as EventPublisher,
    );

    const result = await service.voidPayment({
      paymentId: 'p1',
      organizationId: 'org1',
      voidedByUserId: 'staff1',
      dto: { reason: 'Duplicate entry' },
    });

    expect(voidFn).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    const [event] = emit.mock.calls[0];
    expect(event).toBe('payments.payment.voided');
    expect(result.status).toBe('voided');
  });

  it('throws NotFoundException when payment not found', async () => {
    const service = makeService();
    await expect(
      service.voidPayment({ paymentId: 'nope', organizationId: 'org1', voidedByUserId: 'u1', dto: {} }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when org does not match', async () => {
    const service = makeService({
      findById: jest.fn().mockResolvedValue(makePayment({ organizationId: 'other' })),
    });
    await expect(
      service.voidPayment({ paymentId: 'p1', organizationId: 'org1', voidedByUserId: 'u1', dto: {} }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when already voided', async () => {
    const service = makeService({
      findById: jest.fn().mockResolvedValue(makePayment({ status: 'voided' })),
    });
    await expect(
      service.voidPayment({ paymentId: 'p1', organizationId: 'org1', voidedByUserId: 'u1', dto: {} }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ── listPayments ──────────────────────────────────────────────────────────────

describe('PaymentsService.listPayments', () => {
  it('uses findByResource when resourceType and resourceId are both provided', async () => {
    const findByResource = jest.fn().mockResolvedValue([makePayment()]);
    const findByOrganization = jest.fn();
    const service = makeService({ findByResource, findByOrganization });

    const result = await service.listPayments({
      organizationId: 'org1',
      query: { resourceType: 'lease', resourceId: 'lease1' },
    });

    expect(findByResource).toHaveBeenCalledTimes(1);
    expect(findByOrganization).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
  });

  it('falls back to findByOrganization when resourceId is absent', async () => {
    const findByOrganization = jest.fn().mockResolvedValue([makePayment()]);
    const service = makeService({ findByOrganization });

    const result = await service.listPayments({
      organizationId: 'org1',
      query: { resourceType: 'lease' },
    });

    expect(findByOrganization).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(1);
  });

  it('returns empty list when no payments exist', async () => {
    const service = makeService();
    const result = await service.listPayments({ organizationId: 'org1', query: {} });
    expect(result.items).toHaveLength(0);
  });
});
