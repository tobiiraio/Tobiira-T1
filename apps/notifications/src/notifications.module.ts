import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './channels/email/email.service';
import { CoreEventsHandler } from './handlers/core-events.handler';
import { PerstaEventsHandler } from './handlers/persta-events.handler';
import { PaymentsEventsHandler } from './handlers/payments-events.handler';
import { DocumentsEventsHandler } from './handlers/documents-events.handler';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [CoreEventsHandler, PerstaEventsHandler, PaymentsEventsHandler, DocumentsEventsHandler, HealthController],
  providers: [EmailService],
})
export class NotificationsModule {}
