import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationCategory } from './notification-category';
import { NotificationUseCase } from './notification-use-case';
import { BrevoEmailProvider } from './email/brevo-email.provider';
import { renderAuthOtpEmail } from './email/templates/auth-otp-email.template';
import { renderOrganizationCreatedEmail } from './email/templates/organization-created-email.template';
import { renderOrganizationInviteEmail } from './email/templates/organization-invite-email.template';
import { renderWelcomeEmail } from './email/templates/welcome-email.template';
import type { MembershipRole } from '../roles/membership-role';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly brevoEmailProvider: BrevoEmailProvider;

  constructor(private readonly configService: ConfigService) {
    this.brevoEmailProvider = new BrevoEmailProvider(configService);
  }

  async sendEmail(params: {
    category: NotificationCategory;
    useCase: NotificationUseCase;
    toEmail: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `Email provider not configured. Skipping email for ${params.useCase}.`,
      );
      return;
    }

    await this.brevoEmailProvider.sendEmail({
      toEmail: params.toEmail,
      subject: params.subject,
      html: params.html,
    });
  }

  async sendAuthOtpEmail(params: {
    email: string;
    code: string;
    ttlMinutes: number;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira API';
    const { subject, html } = renderAuthOtpEmail({
      appName,
      code: params.code,
      ttlMinutes: params.ttlMinutes,
    });

    await this.sendEmail({
      category: 'auth',
      useCase: 'auth.otp',
      toEmail: params.email,
      subject,
      html,
    });
  }

  async sendWelcomeEmail(params: { email: string }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira API';
    const { subject, html } = renderWelcomeEmail({ appName });

    await this.sendEmail({
      category: 'system',
      useCase: 'system.welcome',
      toEmail: params.email,
      subject,
      html,
    });
  }

  async sendOrganizationCreatedEmail(params: {
    email: string;
    organizationName: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira API';
    const { subject, html } = renderOrganizationCreatedEmail({
      appName,
      organizationName: params.organizationName,
    });

    await this.sendEmail({
      category: 'organizations',
      useCase: 'organizations.created',
      toEmail: params.email,
      subject,
      html,
    });
  }

  async sendOrganizationInviteEmail(params: {
    email: string;
    organizationId: string;
    role: MembershipRole;
    token: string;
    expiresAt: string;
  }): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Tobiira API';
    const publicUrl = this.configService.get<string>('APP_PUBLIC_URL');
    const acceptUrl = publicUrl
      ? `${publicUrl.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(params.token)}`
      : undefined;

    const { subject, html } = renderOrganizationInviteEmail({
      appName,
      organizationId: params.organizationId,
      role: params.role,
      token: params.token,
      expiresAt: params.expiresAt,
      acceptUrl,
    });

    await this.sendEmail({
      category: 'organizations',
      useCase: 'organizations.invite',
      toEmail: params.email,
      subject,
      html,
    });
  }
}
