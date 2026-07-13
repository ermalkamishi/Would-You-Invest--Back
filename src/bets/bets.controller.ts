import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { BetsService } from './bets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  placeBet(
    @CurrentUser() user: User,
    @Body('startupId') startupId: string,
    @Body('milestoneType') milestoneType: string,
    @Body('targetValue') targetValue: number,
    @Body('prediction') prediction: string,
    @Body('betAmount') betAmount: number,
  ) {
    return this.betsService.placeBet(
      user.id,
      startupId,
      milestoneType,
      targetValue,
      prediction,
      betAmount,
    );
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.betsService.findByUserId(userId);
  }
}

