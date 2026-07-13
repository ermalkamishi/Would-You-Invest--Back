import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetsService } from './bets.service';
import { BetsController } from './bets.controller';
import { Bet } from './entities/bet.entity';
import { User } from '../users/entities/user.entity';
import { Startup } from '../startups/entities/startup.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bet, User, Startup])],
  controllers: [BetsController],
  providers: [BetsService],
  exports: [BetsService],
})
export class BetsModule {}
