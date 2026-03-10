import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

type MongoUriEnvKey = 'MONGODB_URI' | 'MONGODB_URI_CORE';

const getMongoUri = (
  configService: ConfigService,
  primaryKey: string,
  fallbacks: readonly MongoUriEnvKey[],
): string => {
  const primary = configService.get<string>(primaryKey);
  if (primary) return primary;

  for (const key of fallbacks) {
    const value = configService.get<string>(key);
    if (value) return value;
  }

  throw new Error(`${primaryKey} is not set`);
};

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = getMongoUri(configService, 'MONGODB_URI_CORE', [
          'MONGODB_URI',
        ]);
        return { uri };
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      connectionName: 'persta',
      useFactory: (configService: ConfigService) => {
        const uri = getMongoUri(configService, 'MONGODB_URI_PERSTA', [
          'MONGODB_URI_CORE',
          'MONGODB_URI',
        ]);
        return { uri };
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      connectionName: 'testa',
      useFactory: (configService: ConfigService) => {
        const uri = getMongoUri(configService, 'MONGODB_URI_TESTA', [
          'MONGODB_URI_CORE',
          'MONGODB_URI',
        ]);
        return { uri };
      },
    }),
  ],
})
export class DatabaseModule {}
