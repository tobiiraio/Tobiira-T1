import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { CoreClientModule } from '../../core-client/core-client.module';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Tenant.name, schema: TenantSchema }],
      'persta',
    ),
    CoreClientModule,
  ],
  providers: [TenantsRepository, TenantsService],
  controllers: [TenantsController],
  exports: [TenantsRepository],
})
export class TenantsModule {}
