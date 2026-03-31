export function renderDocumentGeneratedEmail(params: {
  appName: string;
  recipientName?: string;
  documentType: string;
  organizationName: string;
}): { subject: string; html: string } {
  const greeting = params.recipientName ? `Hi ${params.recipientName},` : 'Hi,';
  const label: Record<string, string> = {
    receipt: 'Payment Receipt',
    lease: 'Lease Agreement',
    other: 'Document',
  };
  const docLabel = label[params.documentType] ?? 'Document';

  return {
    subject: `Your ${docLabel} from ${params.organizationName} is ready`,
    html: `
      <p>${greeting}</p>
      <p>Your <strong>${docLabel}</strong> from <strong>${params.organizationName}</strong> has been generated and is attached to this email.</p>
      <p>You can also re-download it at any time from your Tobiira portal.</p>
      <p>The ${params.appName} Team</p>
    `.trim(),
  };
}
