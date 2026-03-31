import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PerstaModule } from './persta.module';

async function bootstrap() {
  const app = await NestFactory.create(PerstaModule);
  const logger = new Logger('Persta');
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // ── Swagger ──────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tobiira Persta API')
    .setDescription('Property management — properties, blocks, units, leases, tenants')
    .setVersion('1.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
  app.use('/api/docs-json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });

  const port = Number(configService.get<string>('PORT') ?? 7000);
  await app.listen(port);
  logger.log(`Persta service running on port ${port}`);
}

bootstrap().catch((err) => {
  Logger.error(err, 'Persta bootstrap failed');
  process.exit(1);
});
