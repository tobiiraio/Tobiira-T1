import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      connectionName: 'persta',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI_PERSTA');
        if (!uri) throw new Error('MONGODB_URI_PERSTA is not set');
        return { uri };
      },
    }),
  ],
})
export class DatabaseModule {}
