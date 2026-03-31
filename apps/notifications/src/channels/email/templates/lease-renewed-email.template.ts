export function renderLeaseRenewedEmail(params: {
  appName: string;
  firstName?: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  newEndDate: string;
  rentAmount: number;
  currency: string;
}): { subject: string; html: string } {
  const greeting = params.firstName ? `Hi ${params.firstName},` : 'Hi,';
  return {
    subject: `Your lease at ${params.unitName} has been renewed`,
    html: `
      <p>${greeting}</p>
      <p>Your lease for <strong>${params.unitName}</strong> at <strong>${params.propertyName}</strong> has been renewed.</p>
      <table>
        <tr><td><strong>New end date:</strong></td><td>${params.newEndDate}</td></tr>
        <tr><td><strong>Rent amount:</strong></td><td>${params.currency} ${params.rentAmount}</td></tr>
        <tr><td><strong>Managed by:</strong></td><td>${params.organizationName}</td></tr>
      </table>
      <p>If you have any questions, please contact your property manager.</p>
      <p>The ${params.appName} Team</p>
    `.trim(),
  };
}
