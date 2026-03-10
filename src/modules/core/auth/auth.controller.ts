import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body() dto: RequestOtpDto): Promise<{ ok: true }> {
    return this.authService.requestOtp(dto.email);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshSessionDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshSession(dto.refreshToken);
  }

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
