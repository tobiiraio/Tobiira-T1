import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from './schemas/membership.schema';
import { MembershipsRepository } from './memberships.repository';
import { OrganizationMembershipGuard } from './guards/organization-membership.guard';
import {
  MembershipInvite,
  MembershipInviteSchema,
} from './schemas/membership-invite.schema';
import { JoinRequest, JoinRequestSchema } from './schemas/join-request.schema';
import { MembershipInvitesRepository } from './repositories/membership-invites.repository';
import { JoinRequestsRepository } from './repositories/join-requests.repository';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';
import { InternalApiKeyGuard } from '../../../common/guards/internal-api-key.guard';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { OrganizationsRepository } from '../organizations/organizations.repository';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    RolesModule,
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
      { name: MembershipInvite.name, schema: MembershipInviteSchema },
      { name: JoinRequest.name, schema: JoinRequestSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  controllers: [MembershipsController],
  providers: [
    MembershipsRepository,
    MembershipInvitesRepository,
    JoinRequestsRepository,
    MembershipsService,
    OrganizationMembershipGuard,
    InternalApiKeyGuard,
    OrganizationsRepository,
  ],
  exports: [MembershipsRepository, OrganizationMembershipGuard],
})
export class MembershipsModule {}
