import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type BrevoEmailSender = {
  name: string;
  email: string;
};

type BrevoEmailTo = {
  email: string;
  name?: string;
};

type BrevoSendEmailParams = {
  sender: BrevoEmailSender;
  to: BrevoEmailTo[];
  subject: string;
  htmlContent: string;
};

export class BrevoEmailProvider {
  private readonly logger = new Logger(BrevoEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(params: {
    toEmail: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is not set');
    }

    const senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL');
    const senderName =
      this.configService.get<string>('BREVO_SENDER_NAME') ??
      this.configService.get<string>('APP_NAME') ??
      'Tobiira API';

    if (!senderEmail) {
      throw new Error('BREVO_SENDER_EMAIL is not set');
    }

    const payload: BrevoSendEmailParams = {
      sender: { email: senderEmail, name: senderName },
      to: [{ email: params.toEmail }],
      subject: params.subject,
      htmlContent: params.html,
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `Brevo send failed: ${response.status} ${response.statusText}`,
      );
      if (text) {
        this.logger.error(text);
      }
      throw new Error('Brevo send failed');
    }
  }
}
