import { renderBaseEmailTemplate } from './base-email.template';

type WelcomeEmailParams = {
  appName: string;
};

export const renderWelcomeEmail = (
  params: WelcomeEmailParams,
): { subject: string; html: string } => {
  const subject = `Welcome to ${params.appName}`;

  const html = renderBaseEmailTemplate({
    appName: params.appName,
    title: 'Welcome',
    bodyHtml: `
      <p>Your account has been created successfully.</p>
      <p>You can now create or join organizations and start managing spaces.</p>
    `,
  });

  return { subject, html };
};
