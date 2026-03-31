export function renderPaymentRecordedEmail(params: {
  appName: string;
  payerName?: string;
  amount: number;
  currency: string;
  method: string;
  periodFrom?: string;
  periodTo?: string;
  paidAt: string;
  reference?: string;
}): { subject: string; html: string } {
  const greeting = params.payerName ? `Hi ${params.payerName},` : 'Hi,';
  const methodLabel: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    mobile_money: 'Mobile Money',
  };
  const readableMethod = methodLabel[params.method] ?? params.method;

  return {
    subject: `Payment of ${params.currency} ${params.amount} received`,
    html: `
      <p>${greeting}</p>
      <p>We have recorded a payment on your account.</p>
      <table>
        <tr><td><strong>Amount:</strong></td><td>${params.currency} ${params.amount}</td></tr>
        <tr><td><strong>Method:</strong></td><td>${readableMethod}</td></tr>
        ${params.periodFrom && params.periodTo ? `<tr><td><strong>Period:</strong></td><td>${params.periodFrom} – ${params.periodTo}</td></tr>` : ''}
        <tr><td><strong>Date paid:</strong></td><td>${params.paidAt}</td></tr>
        ${params.reference ? `<tr><td><strong>Reference:</strong></td><td>${params.reference}</td></tr>` : ''}
      </table>
      <p>If you have any questions, please contact your service provider.</p>
      <p>The ${params.appName} Team</p>
    `.trim(),
  };
}
