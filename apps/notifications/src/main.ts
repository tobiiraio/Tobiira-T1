import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { NotificationsModule } from './notifications.module';

async function bootstrap() {
  const logger = new Logger('Notifications');

  const rabbitUrl =
    process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';

  const app = await NestFactory.create(NotificationsModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue: 'notifications.core',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue: 'notifications.persta',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue: 'notifications.payments',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue: 'documents.events',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.PORT ?? 6001);
  await app.listen(port);
  logger.log(`Notifications listening on port ${port} (health) + RabbitMQ`);
}

bootstrap().catch((err) => {
  Logger.error(err, 'Notifications bootstrap failed');
  process.exit(1);
});
