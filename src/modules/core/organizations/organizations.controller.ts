import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { MembershipRole } from '../roles/membership-role';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async createOrganization(
    @CurrentUser() user: CurrentUser,
    @Body() dto: CreateOrganizationDto,
  ): Promise<{ id: string; name: string; role: MembershipRole }> {
    return this.organizationsService.createOrganization({
      userId: user.userId,
      userEmail: user.email,
      name: dto.name,
    });
  }

  @Get()
  async listOrganizations(@CurrentUser() user: CurrentUser): Promise<{
    items: Array<{
      id: string;
      name: string;
      role: MembershipRole | 'unknown';
    }>;
  }> {
    return this.organizationsService.listOrganizationsForUser({
      userId: user.userId,
    });
  }
}
