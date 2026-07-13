import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StartupsService } from './startups.service';
import { StartupsController } from './startups.controller';
import { Startup } from './entities/startup.entity';
import { Investment } from '../investments/entities/investment.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Startup, Investment, User])],
  controllers: [StartupsController],
  providers: [StartupsService],
  exports: [StartupsService],
})
export class StartupsModule {}
