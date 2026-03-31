import type { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { BrevoEmailProvider } from './brevo-email.provider';

// Spy on BrevoEmailProvider so we never hit the network
jest.mock('./brevo-email.provider');

const makeConfig = (overrides: Record<string, string> = {}): ConfigService =>
  ({
    get: (key: string) =>
      ({
        APP_NAME: 'Tobiira',
        BREVO_API_KEY: 'test-api-key',
        APP_PUBLIC_URL: 'https://app.tobiira.com',
        ...overrides,
      })[key],
  }) as unknown as ConfigService;

const getSendEmailMock = () =>
  (BrevoEmailProvider as jest.MockedClass<typeof BrevoEmailProvider>).mock.instances[0]
    .sendEmail as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (BrevoEmailProvider as jest.MockedClass<typeof BrevoEmailProvider>).mockClear();
  (BrevoEmailProvider.prototype.sendEmail as jest.Mock) = jest.fn().mockResolvedValue(undefined);
});

// ── sendAuthOtpEmail ──────────────────────────────────────────────────────────

describe('EmailService.sendAuthOtpEmail', () => {
  it('sends email with OTP code in subject/body', async () => {
    const service = new EmailService(makeConfig());
    await service.sendAuthOtpEmail({ email: 'user@example.com', code: '123456', ttlMinutes: 10 });

    const sendEmail = getSendEmailMock();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = sendEmail.mock.calls[0][0];
    expect(call.toEmail).toBe('user@example.com');
    expect(call.subject).toContain('123456');
    expect(call.html).toContain('123456');
  });

  it('skips sending when BREVO_API_KEY is not set', async () => {
    const service = new EmailService(makeConfig({ BREVO_API_KEY: '' }));
    await service.sendAuthOtpEmail({ email: 'user@example.com', code: '999999', ttlMinutes: 10 });
    expect(getSendEmailMock()).not.toHaveBeenCalled();
  });
});

// ── sendDocumentGeneratedEmail ────────────────────────────────────────────────

describe('EmailService.sendDocumentGeneratedEmail', () => {
  it('sends email with PDF attachment for a receipt', async () => {
    const service = new EmailService(makeConfig());
    const pdfBase64 = Buffer.from('fake-pdf').toString('base64');

    await service.sendDocumentGeneratedEmail({
      email: 'tenant@example.com',
      recipientName: 'Alice',
      documentType: 'receipt',
      organizationName: 'Acme Corp',
      pdfBase64,
    });

    const sendEmail = getSendEmailMock();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = sendEmail.mock.calls[0][0];
    expect(call.toEmail).toBe('tenant@example.com');
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].name).toBe('receipt.pdf');
    expect(call.attachments[0].content).toBe(pdfBase64);
  });

  it('sends email with lease-agreement.pdf filename for lease documents', async () => {
    const service = new EmailService(makeConfig());
    const pdfBase64 = Buffer.from('lease-pdf').toString('base64');

    await service.sendDocumentGeneratedEmail({
      email: 'tenant@example.com',
      documentType: 'lease',
      organizationName: 'Acme Corp',
      pdfBase64,
    });

    const call = getSendEmailMock().mock.calls[0][0];
    expect(call.attachments[0].name).toBe('lease-agreement.pdf');
  });

  it('sends email with document.pdf filename for unknown document types', async () => {
    const service = new EmailService(makeConfig());
    await service.sendDocumentGeneratedEmail({
      email: 'user@example.com',
      documentType: 'other',
      organizationName: 'Acme Corp',
      pdfBase64: Buffer.from('x').toString('base64'),
    });

    const call = getSendEmailMock().mock.calls[0][0];
    expect(call.attachments[0].name).toBe('document.pdf');
  });
});

// ── sendOrgInviteEmail ────────────────────────────────────────────────────────

describe('EmailService.sendOrgInviteEmail', () => {
  it('includes accept-invite URL when APP_PUBLIC_URL is set', async () => {
    const service = new EmailService(makeConfig());
    await service.sendOrgInviteEmail({
      email: 'invitee@example.com',
      organizationId: 'org1',
      role: 'operator',
      token: 'abc123',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const call = getSendEmailMock().mock.calls[0][0];
    expect(call.html).toContain('abc123');
  });

  it('still sends when APP_PUBLIC_URL is not configured', async () => {
    const service = new EmailService(makeConfig({ APP_PUBLIC_URL: '' }));
    await service.sendOrgInviteEmail({
      email: 'invitee@example.com',
      organizationId: 'org1',
      role: 'operator',
      token: 'abc123',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(getSendEmailMock()).toHaveBeenCalledTimes(1);
  });
});

// ── sendPaymentRecordedEmail ──────────────────────────────────────────────────

describe('EmailService.sendPaymentRecordedEmail', () => {
  it('sends payment confirmation email', async () => {
    const service = new EmailService(makeConfig());
    await service.sendPaymentRecordedEmail({
      email: 'tenant@example.com',
      payerName: 'Alice',
      amount: 1200,
      currency: 'KES',
      method: 'bank_transfer',
      paidAt: '2025-01-05T00:00:00.000Z',
    });

    const call = getSendEmailMock().mock.calls[0][0];
    expect(call.toEmail).toBe('tenant@example.com');
    expect(call.html).toMatch(/1200|KES/);
  });
});
