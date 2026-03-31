import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DocumentsEvents, DocumentGeneratedPayload } from '@tobiira/common';
import { EmailService } from '../channels/email/email.service';

@Controller()
export class DocumentsEventsHandler {
  private readonly logger = new Logger(DocumentsEventsHandler.name);

  constructor(private readonly emailService: EmailService) {}

  @EventPattern(DocumentsEvents.DOCUMENT_GENERATED)
  async onDocumentGenerated(@Payload() payload: DocumentGeneratedPayload) {
    try {
      await this.emailService.sendDocumentGeneratedEmail({
        email: payload.recipientEmail,
        recipientName: payload.recipientName,
        documentType: payload.documentType,
        organizationName: payload.organizationName,
        pdfBase64: payload.pdfBase64,
      });
    } catch (err) {
      this.logger.error(err, `Failed to send document email to ${payload.recipientEmail}`);
    }
  }
}
