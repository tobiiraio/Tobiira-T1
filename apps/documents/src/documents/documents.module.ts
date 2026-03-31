import { Module } from '@nestjs/common';
import { PdfService } from '../pdf/pdf.service';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { InternalClientsModule } from '../internal-clients/internal-clients.module';

@Module({
  imports: [InternalClientsModule],
  providers: [PdfService, DocumentsService, GatewayAuthGuard],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
