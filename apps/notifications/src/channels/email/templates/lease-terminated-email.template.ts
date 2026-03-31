export function renderLeaseTerminatedEmail(params: {
  appName: string;
  email: string;
  firstName?: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  terminatedAt: string;
  reason?: string;
}): { subject: string; html: string } {
  const greeting = params.firstName ? `Hi ${params.firstName},` : 'Hi,';
  const date = new Date(params.terminatedAt).toLocaleDateString();
  return {
    subject: `Your lease at ${params.propertyName} has been terminated`,
    html: `
      <p>${greeting}</p>
      <p>Your lease for <strong>${params.unitName}</strong> at <strong>${params.propertyName}</strong> (${params.organizationName}) has been terminated on ${date}.</p>
      ${params.reason ? `<p><strong>Reason:</strong> ${params.reason}</p>` : ''}
      <p>If you have questions, please contact your property manager.</p>
      <p>The ${params.appName} Team</p>
    `.trim(),
  };
}
