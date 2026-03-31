import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { DocumentsService } from './documents.service';

@UseGuards(GatewayAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // On-demand lease PDF — fetches full data from persta and streams the generated PDF
  @Get('leases/:leaseId/pdf')
  async downloadLeasePdf(
    @Param('leaseId') leaseId: string,
    @Res() res: Response,
  ) {
    const result = await this.documentsService.generateLeaseDocumentBuffer(leaseId);
    if (!result) throw new NotFoundException('Lease not found');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Content-Length': result.buffer.length,
    });
    res.end(result.buffer);
  }

  // On-demand payment receipt — fetches full data from payments and streams the generated PDF
  @Get('payments/:paymentId/receipt')
  async downloadReceipt(
    @Param('paymentId') paymentId: string,
    @Res() res: Response,
  ) {
    const result = await this.documentsService.generateReceiptBuffer(paymentId);
    if (!result) throw new NotFoundException('Payment not found');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Content-Length': result.buffer.length,
    });
    res.end(result.buffer);
  }
}
