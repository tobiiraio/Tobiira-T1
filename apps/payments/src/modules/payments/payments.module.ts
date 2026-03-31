import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Payment.name, schema: PaymentSchema }],
      'payments',
    ),
    ConfigModule,
  ],
  providers: [PaymentsRepository, PaymentsService, InternalApiKeyGuard],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
