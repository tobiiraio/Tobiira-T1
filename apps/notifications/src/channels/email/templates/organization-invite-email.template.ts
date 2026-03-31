import { renderBaseEmailTemplate } from './base-email.template';
import type { MembershipRole } from '../../../roles/membership-role';

type OrganizationInviteEmailParams = {
  appName: string;
  organizationId: string;
  role: MembershipRole;
  token: string;
  expiresAt: string;
  acceptUrl?: string;
};

export const renderOrganizationInviteEmail = (
  params: OrganizationInviteEmailParams,
): { subject: string; html: string } => {
  const subject = `${params.appName}: Organization invite`;

  const acceptSection = params.acceptUrl
    ? `<p><a href="${params.acceptUrl}">Accept invite</a></p>`
    : `<p>Use this invite token:</p>
       <div style="font-size:14px;font-weight:700;word-break:break-all;margin:16px 0;padding:12px;border-radius:8px;background:#f3f4f6;">${params.token}</div>
       <p>API: <code>POST /api/v1/memberships/accept-invite</code></p>`;

  const html = renderBaseEmailTemplate({
    appName: params.appName,
    title: 'You have been invited',
    bodyHtml: `
      <p>You have been invited to join an organization.</p>
      <p><strong>Organization ID:</strong> ${params.organizationId}</p>
      <p><strong>Role:</strong> ${params.role}</p>
      ${acceptSection}
      <p>This invite expires at <strong>${params.expiresAt}</strong>.</p>
    `,
  });

  return { subject, html };
};
