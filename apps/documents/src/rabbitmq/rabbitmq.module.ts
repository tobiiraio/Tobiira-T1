import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RABBITMQ_QUEUES } from '@tobiira/common';
import { RABBITMQ_CLIENT } from '../documents/documents.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672'],
            queue: RABBITMQ_QUEUES.DOCUMENTS_EVENTS,
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  exports: [RABBITMQ_CLIENT],
})
export class RabbitMQModule {}
