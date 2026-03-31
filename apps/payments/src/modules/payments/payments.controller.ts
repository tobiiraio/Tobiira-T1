import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GatewayAuthGuard } from '../../common/guards/gateway-auth.guard';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { CurrentGatewayUser } from '../../common/decorators/gateway-user.decorator';
import type { GatewayUser } from '../../common/guards/gateway-auth.guard';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

@ApiTags('payments')
@UseGuards(GatewayAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Record a payment against any resource in any vertical' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  @Post()
  async recordPayment(
    @CurrentGatewayUser() user: GatewayUser,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.paymentsService.recordPayment({
      organizationId: user.orgId,
      recordedByUserId: user.userId,
      dto,
    });
  }

  @ApiOperation({ summary: 'List payments for the organization, with optional filters' })
  @ApiResponse({ status: 200, description: 'Payment list' })
  @Get()
  async listPayments(
    @CurrentGatewayUser() user: GatewayUser,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.paymentsService.listPayments({
      organizationId: user.orgId,
      query,
    });
  }

  @ApiOperation({ summary: 'Get a single payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @Get(':paymentId')
  async getPayment(
    @CurrentGatewayUser() user: GatewayUser,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.getPayment({
      paymentId,
      organizationId: user.orgId,
    });
  }

  @ApiOperation({ summary: 'Void a payment' })
  @ApiResponse({ status: 200, description: 'Payment voided' })
  @ApiResponse({ status: 400, description: 'Payment already voided' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @HttpCode(HttpStatus.OK)
  @Patch(':paymentId/void')
  async voidPayment(
    @CurrentGatewayUser() user: GatewayUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: VoidPaymentDto,
  ) {
    return this.paymentsService.voidPayment({
      paymentId,
      organizationId: user.orgId,
      voidedByUserId: user.userId,
      dto,
    });
  }

  @ApiOperation({ summary: '[Internal] Get full payment data — service-to-service only' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @UseGuards(InternalApiKeyGuard)
  @Get(':paymentId/internal')
  async getPaymentInternal(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPaymentInternal(paymentId);
  }
}
