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

  const mongoEnv = {
    core: configService.get<string>('MONGODB_URI_CORE'),
    persta: configService.get<string>('MONGODB_URI_PERSTA'),
    testa: configService.get<string>('MONGODB_URI_TESTA'),
  };
  logger.log(
    `mongodb connections: core=MONGODB_URI_CORE(${mongoEnv.core ? 'set' : 'missing'}), persta=MONGODB_URI_PERSTA(${mongoEnv.persta ? 'set' : 'missing'}), testa=MONGODB_URI_TESTA(${mongoEnv.testa ? 'set' : 'missing'})`,
  );

  const apiPrefix =
    configService.get<string>('API_PREFIX') ??
    (configService.get<string>('API_VERSION')
      ? `api/${configService.get<string>('API_VERSION')}`
      : undefined) ??
    'api/v1';
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tobiira API')
    .setDescription('Spatial data and AI platform API')
    .setVersion('1.0')
    .addServer(`/${apiPrefix}`)
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
  app.use('/api/docs-json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });

  const coreConnection = app.get<Connection>(getConnectionToken());
  const perstaConnection = app.get<Connection>(getConnectionToken('persta'));
  const testaConnection = app.get<Connection>(getConnectionToken('testa'));
  let serverListening = false;
  const connectionStates = {
    core: { connected: Number(coreConnection.readyState) === 1, logged: false },
    persta: {
      connected: Number(perstaConnection.readyState) === 1,
      logged: false,
    },
    testa: {
      connected: Number(testaConnection.readyState) === 1,
      logged: false,
    },
  };

  const logDbConnected = (name: keyof typeof connectionStates) => {
    if (!serverListening) return;
    const state = connectionStates[name];
    if (state.logged) return;
    state.logged = true;
    if (name === 'core') {
      logger.log('database connected (core)');
      return;
    }
    logger.log(`database connected (${name})`);
  };

  coreConnection.once('connected', () => {
    connectionStates.core.connected = true;
    logDbConnected('core');
  });
  perstaConnection.once('connected', () => {
    connectionStates.persta.connected = true;
    logDbConnected('persta');
  });
  testaConnection.once('connected', () => {
    connectionStates.testa.connected = true;
    logDbConnected('testa');
  });

  const portRaw = configService.get<string>('PORT') ?? '3000';
  const port = Number(portRaw);
  await app.listen(Number.isFinite(port) ? port : 3000);

  serverListening = true;
  logger.log(`server running at port:${Number.isFinite(port) ? port : 3000}`);
  if (connectionStates.core.connected) logDbConnected('core');
  if (connectionStates.persta.connected) logDbConnected('persta');
  if (connectionStates.testa.connected) logDbConnected('testa');
}
bootstrap().catch((error) => {
  Logger.error(error, 'Bootstrap failed');
  process.exit(1);
});
