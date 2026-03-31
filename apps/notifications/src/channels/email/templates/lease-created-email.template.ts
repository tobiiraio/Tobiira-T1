export function renderLeaseCreatedEmail(params: {
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
  paymentFrequency: string;
}): { subject: string; html: string } {
  const greeting = params.firstName ? `Hi ${params.firstName},` : 'Hi,';
  const start = new Date(params.startDate).toLocaleDateString();
  const end = new Date(params.endDate).toLocaleDateString();
  return {
    subject: `Lease drafted for ${params.unitName} at ${params.propertyName}`,
    html: `
      <p>${greeting}</p>
      <p>A lease has been created for you at <strong>${params.organizationName}</strong>.</p>
      <table>
        <tr><td><strong>Property</strong></td><td>${params.propertyName}</td></tr>
        <tr><td><strong>Unit</strong></td><td>${params.unitName}</td></tr>
        <tr><td><strong>Start date</strong></td><td>${start}</td></tr>
        <tr><td><strong>End date</strong></td><td>${end}</td></tr>
        <tr><td><strong>Rent</strong></td><td>${params.currency} ${params.rentAmount} / ${params.paymentFrequency}</td></tr>
      </table>
      <p>Your lease is currently pending activation. You will receive another email once it is active.</p>
      <p>The ${params.appName} Team</p>
    `.trim(),
  };
}
