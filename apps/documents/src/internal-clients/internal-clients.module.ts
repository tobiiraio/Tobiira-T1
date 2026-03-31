import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PerstaClientService } from './persta-client.service';
import { PaymentsClientService } from './payments-client.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [PerstaClientService, PaymentsClientService],
  exports: [PerstaClientService, PaymentsClientService],
})
export class InternalClientsModule {}
