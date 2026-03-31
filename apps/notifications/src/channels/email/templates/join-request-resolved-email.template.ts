export function renderJoinRequestResolvedEmail(params: {
  appName: string;
  decision: 'approved' | 'rejected';
  organizationName: string;
}): { subject: string; html: string } {
  const approved = params.decision === 'approved';
  return {
    subject: approved
      ? `Your request to join ${params.organizationName} was approved`
      : `Your request to join ${params.organizationName} was not approved`,
    html: approved
      ? `
        <p>Great news! Your request to join <strong>${params.organizationName}</strong> has been approved.</p>
        <p>You are now a member. Log in to ${params.appName} to get started.</p>
        <p>The ${params.appName} Team</p>
      `.trim()
      : `
        <p>Your request to join <strong>${params.organizationName}</strong> was not approved at this time.</p>
        <p>If you think this is a mistake, please contact the organization directly.</p>
        <p>The ${params.appName} Team</p>
      `.trim(),
  };
}
