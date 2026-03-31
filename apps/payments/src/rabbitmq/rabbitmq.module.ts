import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RABBITMQ_QUEUES } from '@tobiira/common';
import { EventPublisher } from './event-publisher.service';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

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
            queue: RABBITMQ_QUEUES.NOTIFICATIONS_PAYMENTS,
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [EventPublisher],
  exports: [EventPublisher],
})
export class RabbitMQModule {}
