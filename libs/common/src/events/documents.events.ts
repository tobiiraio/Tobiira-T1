export const DocumentsEvents = {
  DOCUMENT_GENERATED: 'documents.document.generated',
} as const;

export type DocumentsEvent = (typeof DocumentsEvents)[keyof typeof DocumentsEvents];

export interface DocumentGeneratedPayload {
  documentType: 'receipt' | 'lease' | 'other';
  // PDF content as base64 — no storage; notifications service attaches it directly to the email
  pdfBase64: string;
  recipientEmail: string;
  recipientName?: string;
  organizationName: string;
  metadata: Record<string, string>;
}
