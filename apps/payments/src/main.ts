import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PaymentsModule } from './payments.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentsModule);
  const logger = new Logger('Payments');
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // ── Swagger ──────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tobiira Payments API')
    .setDescription('Vertical-agnostic payment recording, listing, and voiding')
    .setVersion('1.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
  app.use('/api/docs-json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });

  const port = Number(configService.get<string>('PORT') ?? 6003);
  await app.listen(port);
  logger.log(`Payments service running on port ${port}`);
}

bootstrap().catch((err) => {
  Logger.error(err, 'Payments bootstrap failed');
  process.exit(1);
});
