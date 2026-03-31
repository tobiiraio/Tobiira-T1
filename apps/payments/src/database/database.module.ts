import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      connectionName: 'payments',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI_PAYMENTS');
        if (!uri) throw new Error('MONGODB_URI_PAYMENTS is not set');
        return { uri };
      },
    }),
  ],
})
export class DatabaseModule {}
