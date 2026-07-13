import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SelfOrAdminGuard } from '../auth/guards/self-or-admin.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('leaderboard/roi')
  getLeaderboardByRoi() {
    return this.usersService.getLeaderboardByRoi();
  }

  @Post(':id/referral')
  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  claimReferral(
    @Param('id') id: string,
    @Body('friendEmail') friendEmail: string,
  ) {
    return this.usersService.claimReferral(id, friendEmail);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  followFounder(
    @Param('id') followerId: string,
    @Body('founderId') founderId: string,
  ) {
    return this.usersService.followFounder(followerId, founderId);
  }

  @Post(':id/unfollow')
  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  unfollowFounder(
    @Param('id') followerId: string,
    @Body('founderId') founderId: string,
  ) {
    return this.usersService.unfollowFounder(followerId, founderId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

