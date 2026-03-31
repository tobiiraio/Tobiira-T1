import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { DocumentsModule as DocumentsFeatureModule } from './documents/documents.module';
import { EventsHandler } from './handlers/events.handler';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQModule,
    DocumentsFeatureModule,
  ],
  controllers: [EventsHandler, HealthController],
})
export class DocumentsModule {}
