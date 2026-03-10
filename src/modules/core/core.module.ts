import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MembershipsModule } from './memberships/memberships.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MembershipsModule,
    OrganizationsModule,
    NotificationsModule,
  ],
})
export class CoreModule {}
