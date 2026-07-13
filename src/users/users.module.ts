import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { Investment } from '../investments/entities/investment.entity';
import { Referral } from './entities/referral.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Investment, Follow, Referral])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
