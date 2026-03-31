export function renderJoinRequestReceivedEmail(params: {
  appName: string;
  userEmail: string;
  organizationName: string;
  message?: string;
}): { subject: string; html: string } {
  return {
    subject: `New join request for ${params.organizationName}`,
    html: `
      <p>A user has requested to join <strong>${params.organizationName}</strong> on ${params.appName}.</p>
      <p><strong>Email:</strong> ${params.userEmail}</p>
      ${params.message ? `<p><strong>Message:</strong> ${params.message}</p>` : ''}
      <p>Log in to review and approve or reject the request.</p>
      <p>The ${params.appName} Team</p>
    `.trim(),
  };
}
