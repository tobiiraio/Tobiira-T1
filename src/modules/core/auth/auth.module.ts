import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import {
  OtpChallenge,
  OtpChallengeSchema,
} from './schemas/otp-challenge.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { Session, SessionSchema } from './schemas/session.schema';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_ACCESS_SECRET') ??
          configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is not set');
        }
        return { secret };
      },
    }),
    MongooseModule.forFeature([
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService],
})
export class AuthModule {}
