import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { HealthController } from './health.controller';
import { PaymentsModule as PaymentsFeatureModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RabbitMQModule,
    PaymentsFeatureModule,
  ],
  controllers: [HealthController],
})
export class PaymentsModule {}
