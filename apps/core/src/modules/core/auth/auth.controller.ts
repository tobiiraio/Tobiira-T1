import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Request a one-time password sent to the provided email' })
  @ApiResponse({ status: 201, description: 'OTP sent' })
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('request-otp')
  async requestOtp(@Body() dto: RequestOtpDto): Promise<{ ok: true }> {
    return this.authService.requestOtp(dto.email);
  }

  @ApiOperation({ summary: 'Verify OTP and receive access + refresh tokens' })
  @ApiResponse({ status: 201, description: 'Tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  @Post('verify-otp')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.verifyOtp(dto);
  }

  @ApiOperation({ summary: 'Rotate refresh token and receive new token pair' })
  @ApiResponse({ status: 201, description: 'Tokens rotated' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshSessionDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshSession(dto.refreshToken);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate access token and return current session' })
  @ApiResponse({ status: 200, description: 'Session details' })
  @ApiResponse({ status: 401, description: 'Invalid or missing token' })
  @Get('session')
  async getSession(
    @Headers('authorization') authorization?: string,
  ): Promise<{ userId: string; email: string }> {
    const value = authorization?.trim();
    if (!value?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Missing Authorization bearer token');
    }

    const token = value.slice('bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Authorization bearer token');
    }

    return this.authService.getSessionUserFromAccessToken(token);
  }
}
