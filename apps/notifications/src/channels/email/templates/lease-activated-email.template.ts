export function renderLeaseActivatedEmail(params: {
  appName: string;
  email: string;
  firstName?: string;
  unitName: string;
  propertyName: string;
  organizationName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: string;
}): { subject: string; html: string } {
  const greeting = params.firstName ? `Hi ${params.firstName},` : 'Hi,';
  const start = new Date(params.startDate).toLocaleDateString();
  const end = new Date(params.endDate).toLocaleDateString();
  return {
    subject: `Your lease at ${params.propertyName} is now active`,
    html: `
      <p>${greeting}</p>
      <p>Your lease at <strong>${params.organizationName}</strong> is now active.</p>
      <table>
        <tr><td><strong>Property</strong></td><td>${params.propertyName}</td></tr>
        <tr><td><strong>Unit</strong></td><td>${params.unitName}</td></tr>
        <tr><td><strong>Start date</strong></td><td>${start}</td></tr>
        <tr><td><strong>End date</strong></td><td>${end}</td></tr>
        <tr><td><strong>Rent</strong></td><td>${params.currency} ${params.rentAmount}</td></tr>
      </table>
      <p>Welcome to your new home. The ${params.appName} Team</p>
    `.trim(),
  };
}
