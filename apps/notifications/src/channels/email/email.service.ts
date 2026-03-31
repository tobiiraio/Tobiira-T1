import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MembershipRole } from '@tobiira/common';
import { BrevoEmailProvider } from './brevo-email.provider';
import { renderAuthOtpEmail } from './templates/auth-otp-email.template';
import { renderWelcomeEmail } from './templates/welcome-email.template';
import { renderOrganizationCreatedEmail } from './templates/organization-created-email.template';
import { renderOrganizationInviteEmail } from './templates/organization-invite-email.template';
import { renderJoinRequestReceivedEmail } from './templates/join-request-received-email.template';
import { renderJoinRequestResolvedEmail } from './templates/join-request-resolved-email.template';
import { renderTenantEnrolledEmail } from './templates/tenant-enrolled-email.template';
import { renderLeaseCreatedEmail } from './templates/lease-created-email.template';
import { renderLeaseActivatedEmail } from './templates/lease-activated-email.template';
import { renderLeaseTerminatedEmail } from './templates/lease-terminated-email.template';
import { renderLeaseRenewedEmail } from './templates/lease-renewed-email.template';
import { renderPaymentRecordedEmail } from './templates/payment-recorded-email.template';
import { renderDocumentGeneratedEmail } from './templates/document-generated-email.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevo: BrevoEmailProvider;

  constructor(private readonly configService: ConfigService) {
    this.brevo = new BrevoEmailProvider(configService);
  }

  async sendAuthOtpEmail(params: {
    email: string;
    code: string;
    ttlMinutes: number;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderAuthOtpEmail({ appName, code: params.code, ttlMinutes: params.ttlMinutes });
    await this.send(params.email, subject, html);
  }

  async sendWelcomeEmail(params: { email: string }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderWelcomeEmail({ appName });
    await this.send(params.email, subject, html);
  }

  async sendOrgCreatedEmail(params: {
    email: string;
    organizationName: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderOrganizationCreatedEmail({ appName, organizationName: params.organizationName });
    await this.send(params.email, subject, html);
  }

  async sendOrgInviteEmail(params: {
    email: string;
    organizationId: string;
    role: MembershipRole | string;
    token: string;
    expiresAt: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const publicUrl = this.configService.get<string>('APP_PUBLIC_URL');
    const acceptUrl = publicUrl
      ? `${publicUrl.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(params.token)}`
      : undefined;

    const { subject, html } = renderOrganizationInviteEmail({
      appName,
      organizationId: params.organizationId,
      role: params.role as MembershipRole,
      token: params.token,
      expiresAt: params.expiresAt,
      acceptUrl,
    });
    await this.send(params.email, subject, html);
  }

  // notifies the org owner/operator that someone has requested to join
  async sendJoinRequestReceivedEmail(params: {
    toEmail: string; // owner/operator's email
    userEmail: string;
    organizationName: string;
    message?: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderJoinRequestReceivedEmail({ appName, userEmail: params.userEmail, organizationName: params.organizationName, message: params.message });
    await this.send(params.toEmail, subject, html);
  }

  // notifies the requester of the decision
  async sendJoinRequestResolvedEmail(params: {
    email: string;
    decision: 'approved' | 'rejected';
    organizationName: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderJoinRequestResolvedEmail({ appName, decision: params.decision, organizationName: params.organizationName });
    await this.send(params.email, subject, html);
  }

  async sendTenantEnrolledEmail(params: {
    email: string;
    firstName?: string;
    organizationName: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderTenantEnrolledEmail({ appName, ...params });
    await this.send(params.email, subject, html);
  }

  async sendLeaseCreatedEmail(params: {
    email: string;
    firstName?: string;
    unitName: string;
    propertyName: string;
    organizationName: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    currency: string;
    paymentFrequency: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderLeaseCreatedEmail({ appName, ...params });
    await this.send(params.email, subject, html);
  }

  async sendLeaseActivatedEmail(params: {
    email: string;
    firstName?: string;
    unitName: string;
    propertyName: string;
    organizationName: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    currency: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderLeaseActivatedEmail({ appName, ...params });
    await this.send(params.email, subject, html);
  }

  async sendLeaseTerminatedEmail(params: {
    email: string;
    firstName?: string;
    unitName: string;
    propertyName: string;
    organizationName: string;
    terminatedAt: string;
    reason?: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderLeaseTerminatedEmail({ appName, ...params });
    await this.send(params.email, subject, html);
  }

  async sendLeaseRenewedEmail(params: {
    email: string;
    firstName?: string;
    unitName: string;
    propertyName: string;
    organizationName: string;
    newEndDate: string;
    rentAmount: number;
    currency: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderLeaseRenewedEmail({ appName, ...params });
    await this.send(params.email, subject, html);
  }

  async sendPaymentRecordedEmail(params: {
    email: string;
    payerName?: string;
    amount: number;
    currency: string;
    method: string;
    periodFrom?: string;
    periodTo?: string;
    paidAt: string;
    reference?: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const { subject, html } = renderPaymentRecordedEmail({ appName, ...params });
    await this.send(params.email, subject, html);
  }

  async sendDocumentGeneratedEmail(params: {
    email: string;
    recipientName?: string;
    documentType: string;
    organizationName: string;
    pdfBase64: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira';
    const label: Record<string, string> = { receipt: 'Payment Receipt', lease: 'Lease Agreement', other: 'Document' };
    const docLabel = label[params.documentType] ?? 'Document';
    const fileName = params.documentType === 'receipt' ? 'receipt.pdf' : params.documentType === 'lease' ? 'lease-agreement.pdf' : 'document.pdf';

    const { subject, html } = renderDocumentGeneratedEmail({ appName, ...params });
    await this.send(params.email, subject, html, [{ content: params.pdfBase64, name: fileName }]);
  }

  private async send(
    toEmail: string,
    subject: string,
    html: string,
    attachments?: { content: string; name: string }[],
  ): Promise<void> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY not set, skipping email');
      return;
    }
    await this.brevo.sendEmail({ toEmail, subject, html, attachments });
  }
}
