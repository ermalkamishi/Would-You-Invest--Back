import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { User } from '../users/entities/user.entity';
import { Startup } from '../startups/entities/startup.entity';
import { Investment } from '../investments/entities/investment.entity';
import { Comment } from '../comments/entities/comment.entity';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Startup, Investment, Comment]),
  ],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
