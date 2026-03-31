import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Connection } from 'mongoose';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // ── CORS ────────────────────────────────────────────────────────────────────
  const rawOrigins = configService.get<string>('CORS_ORIGINS') ?? '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
    credentials: true,
  });

  // ── Global prefix & validation ───────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // ── Swagger ──────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tobiira Core API')
    .setDescription('Auth, users, organizations, and memberships')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
  app.use('/api/docs-json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });

  // ── DB connection logging ────────────────────────────────────────────────────
  const coreConnection = app.get<Connection>(getConnectionToken());
  let serverListening = false;

  const logDbConnected = (name: string) => {
    if (!serverListening) return;
    logger.log(`database connected (${name})`);
  };

  if (Number(coreConnection.readyState) === 1) {
    // already connected before server starts
  } else {
    coreConnection.once('connected', () => logDbConnected('core'));
  }

  // ── Listen ───────────────────────────────────────────────────────────────────
  const port = Number(configService.get<string>('PORT') ?? 6000);
  await app.listen(Number.isFinite(port) ? port : 6000);

  serverListening = true;
  logger.log(`Core service running on port ${port}`);
  if (Number(coreConnection.readyState) === 1) logDbConnected('core');
}

bootstrap().catch((error) => {
  Logger.error(error, 'Bootstrap failed');
  process.exit(1);
});
