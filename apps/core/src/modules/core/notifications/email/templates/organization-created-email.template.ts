import { renderBaseEmailTemplate } from './base-email.template';

type OrganizationCreatedEmailParams = {
  appName: string;
  organizationName: string;
};

export const renderOrganizationCreatedEmail = (
  params: OrganizationCreatedEmailParams,
): { subject: string; html: string } => {
  const subject = `${params.appName}: Organization created`;

  const html = renderBaseEmailTemplate({
    appName: params.appName,
    title: 'Organization created',
    bodyHtml: `
      <p>Your organization has been created:</p>
      <p><strong>${params.organizationName}</strong></p>
    `,
  });

  return { subject, html };
};
