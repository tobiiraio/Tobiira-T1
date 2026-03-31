import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { Lease, LeaseSchema } from './schemas/lease.schema';
import { LeasesRepository } from './leases.repository';
import { LeasesService } from './leases.service';
import { LeasesController } from './leases.controller';
import { LeaseExpiryService } from './lease-expiry.service';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { PropertiesModule } from '../properties/properties.module';
import { TenantsModule } from '../tenants/tenants.module';
import { CoreClientModule } from '../../core-client/core-client.module';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Lease.name, schema: LeaseSchema }],
      'persta',
    ),
    ScheduleModule.forRoot(),
    ConfigModule,
    PropertiesModule,
    TenantsModule,
    CoreClientModule,
  ],
  providers: [LeasesRepository, LeasesService, LeaseExpiryService, InternalApiKeyGuard],
  controllers: [LeasesController],
})
export class LeasesModule {}
