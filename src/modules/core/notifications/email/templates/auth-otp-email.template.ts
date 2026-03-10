import { renderBaseEmailTemplate } from './base-email.template';

type AuthOtpEmailParams = {
  appName: string;
  code: string;
  ttlMinutes: number;
};

export const renderAuthOtpEmail = (
  params: AuthOtpEmailParams,
): { subject: string; html: string } => {
  const subject = `${params.appName} login code`;

  const html = renderBaseEmailTemplate({
    appName: params.appName,
    title: 'Your login code',
    bodyHtml: `
      <p>Use the code below to sign in:</p>
      <div style="font-size:28px;font-weight:800;letter-spacing:6px;margin:16px 0;">${params.code}</div>
      <p>This code expires in <strong>${params.ttlMinutes} minutes</strong>.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    `,
  });

  return { subject, html };
};
