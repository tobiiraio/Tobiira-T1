import { Module } from '@nestjs/common';
import { MembershipRolesGuard } from './guards/membership-roles.guard';

@Module({
  providers: [MembershipRolesGuard],
  exports: [MembershipRolesGuard],
})
export class RolesModule {}
