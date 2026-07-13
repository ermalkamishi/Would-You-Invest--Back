import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Startup } from '../startups/entities/startup.entity';
import { User } from '../users/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Startup)
    private readonly startupRepo: Repository<Startup>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateCommentDto): Promise<Comment> {
    const startup = await this.startupRepo.findOneBy({ id: dto.startupId });
    if (!startup) {
      throw new NotFoundException('Startup pitch not found');
    }

    if (!dto.text || dto.text.trim() === '') {
      throw new BadRequestException('Comment text cannot be empty');
    }

    const comment = this.commentRepo.create({
      startupId: dto.startupId,
      userId,
      text: dto.text.trim(),
      upvotedBy: [],
    });

    const saved = await this.commentRepo.save(comment);
    return this.commentRepo.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });
  }

  async findAllForStartup(startupId: string): Promise<Comment[]> {
    return this.commentRepo.find({
      where: { startupId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async upvote(userId: string, commentId: string): Promise<Comment> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: { user: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // TypeORM simple-array yields string[] (or occasionally null/empty string)
    let upvotedBy = comment.upvotedBy || [];
    // Clean up if it parsed empty string incorrectly
    if (upvotedBy.length === 1 && upvotedBy[0] === '') {
      upvotedBy = [];
    }

    const index = upvotedBy.indexOf(userId);
    if (index > -1) {
      upvotedBy.splice(index, 1);
    } else {
      upvotedBy.push(userId);
    }
    comment.upvotedBy = upvotedBy;

    return this.commentRepo.save(comment);
  }

  async remove(userId: string, userRole: string, id: string): Promise<void> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepo.delete(id);
  }
}
