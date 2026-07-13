import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body('email') email: string,
    @Body('username') username: string,
    @Body('role') role: string,
    @Body('password') password: string,
    @Body('referrer') referrer?: string,
  ) {
    return this.authService.register(email, username, role, password, referrer);
  }

  @Post('login')
  login(
    @Body('email') email: string,
    @Body('password') password?: string,
  ) {
    return this.authService.login(email, password);
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getMetrics() {
    return this.authService.getMetrics();
  }

  @Post('claim-stipend')
  @UseGuards(JwtAuthGuard)
  claimStipend(@CurrentUser() user: User) {
    return this.authService.claimStipend(user.id);
  }
}
