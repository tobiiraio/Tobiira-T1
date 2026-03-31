import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentsModule } from './documents.module';

async function bootstrap() {
  const logger = new Logger('Documents');
  const app = await NestFactory.create(DocumentsModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const rabbitUrl = configService.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';

  // Consume persta and payments events to auto-generate docs
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

  await app.startAllMicroservices();

  const port = Number(configService.get<string>('PORT') ?? 6002);
  await app.listen(port);
  logger.log(`Documents service running on port ${port}`);
}

bootstrap().catch((err) => {
  Logger.error(err, 'Documents bootstrap failed');
  process.exit(1);
});
