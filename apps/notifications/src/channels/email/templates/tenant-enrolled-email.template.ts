export function renderTenantEnrolledEmail(params: {
  appName: string;
  email: string;
  firstName?: string;
  organizationName: string;
}): { subject: string; html: string } {
  const greeting = params.firstName ? `Hi ${params.firstName},` : 'Hi,';
  return {
    subject: `You've been added as a tenant at ${params.organizationName}`,
    html: `
      <p>${greeting}</p>
      <p>You have been enrolled as a tenant at <strong>${params.organizationName}</strong> on ${params.appName}.</p>
      <p>You can now access your tenancy details through the platform.</p>
      <p>The ${params.appName} Team</p>
    `.trim(),
  };
}
