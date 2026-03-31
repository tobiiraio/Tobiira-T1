import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';
import { InternalApiKeyGuard } from '../../../common/guards/internal-api-key.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @Get('me')
  async me(@CurrentUser() user: CurrentUserType): Promise<{
    id: string;
    email: string;
    name?: string;
    phone?: string;
    isEmailVerified: boolean;
    isPhoneVerified?: boolean;
  }> {
    return this.usersService.getMe({ userId: user.userId });
  }

  @ApiOperation({ summary: '[Internal] Get user by ID — service-to-service only' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(InternalApiKeyGuard)
  @Get(':userId')
  async getUserById(
    @Param('userId') userId: string,
  ): Promise<{ id: string; email: string; name?: string; phone?: string }> {
    return this.usersService.getUserById({ userId });
  }

  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @Patch('me')
  async updateMe(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateMeDto,
  ): Promise<{
    id: string;
    email: string;
    name?: string;
    phone?: string;
    isEmailVerified: boolean;
    isPhoneVerified?: boolean;
  }> {
    return this.usersService.updateMe({ userId: user.userId, dto });
  }
}
