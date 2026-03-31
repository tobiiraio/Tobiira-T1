import { Injectable } from '@nestjs/common';
import { JwtAccessGuard } from './jwt-access.guard';

@Injectable()
export class JwtAuthGuard extends JwtAccessGuard {}

