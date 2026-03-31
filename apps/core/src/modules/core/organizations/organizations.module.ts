import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MembershipsModule } from '../memberships/memberships.module';
import {
  Organization,
  OrganizationSchema,
} from './schemas/organization.schema';
import {
  OrganizationSettings,
  OrganizationSettingsSchema,
} from './schemas/organization-settings.schema';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';
import { InternalApiKeyGuard } from '../../../common/guards/internal-api-key.guard';

@Module({
  imports: [
    AuthModule,
    MembershipsModule,
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationSettings.name, schema: OrganizationSettingsSchema },
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsRepository, OrganizationsService, InternalApiKeyGuard],
  exports: [OrganizationsRepository],
})
export class OrganizationsModule {}
