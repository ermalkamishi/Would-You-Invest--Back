import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(user.id, dto);
  }

  @Get('startup/:startupId')
  findAllForStartup(@Param('startupId') startupId: string) {
    return this.commentsService.findAllForStartup(startupId);
  }

  @Post(':id/upvote')
  @UseGuards(JwtAuthGuard)
  upvote(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commentsService.upvote(user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commentsService.remove(user.id, user.role, id);
  }
}
