import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Patch, BadRequestException } from '@nestjs/common';
import { StartupsService } from './startups.service';
import { CreateStartupDto } from './dto/create-startup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('startups')
export class StartupsController {
  constructor(private readonly startupsService: StartupsService) {}

  // POST /startups — create a pitch (founder action)
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateStartupDto) {
    return this.startupsService.create(user.id, dto);
  }

  // GET /startups?sort=hot&allStatuses=true
  @Get()
  findAll(
    @Query('sort') sort: string,
    @Query('allStatuses') allStatuses: string,
  ) {
    return this.startupsService.findAll(sort, allStatuses === 'true');
  }

  // GET /startups/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.startupsService.findOne(id);
  }

  // POST /startups/:id/invest — invest virtual money
  @Post(':id/invest')
  @UseGuards(JwtAuthGuard)
  invest(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @CurrentUser() user: User,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Investment amount must be positive');
    }
    return this.startupsService.invest(id, Number(amount), user.id);
  }

  // PATCH /startups/:id/status — update moderation status
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.startupsService.updateStatus(id, status);
  }

  // DELETE /startups/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.startupsService.remove(id);
  }

  // POST /startups/:id/pass — submit pass reason
  @Post(':id/pass')
  submitPass(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.startupsService.submitPassReason(id, reason);
  }

  // POST /startups/:id/updates — post founder update
  @Post(':id/updates')
  @UseGuards(JwtAuthGuard)
  addUpdate(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('text') text: string,
  ) {
    return this.startupsService.addUpdate(id, user.id, text);
  }
}
