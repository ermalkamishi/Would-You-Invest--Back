import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet } from './entities/bet.entity';
import { User } from '../users/entities/user.entity';
import { Startup } from '../startups/entities/startup.entity';

@Injectable()
export class BetsService {
  constructor(
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Startup)
    private readonly startupRepo: Repository<Startup>,
  ) {}

  async placeBet(
    userId: string,
    startupId: string,
    milestoneType: string,
    targetValue: number,
    prediction: string,
    betAmount: number,
  ): Promise<Bet> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'founder') throw new BadRequestException('Founders cannot place bets');

    const startup = await this.startupRepo.findOneBy({ id: startupId });
    if (!startup) throw new NotFoundException('Startup not found');

    if (Number(user.walletBalance) < betAmount) {
      throw new BadRequestException('Insufficient wallet balance to place bet');
    }

    // Deduct bet amount from wallet
    user.walletBalance = Number(user.walletBalance) - betAmount;
    await this.userRepo.save(user);

    const newBet = this.betRepo.create({
      userId,
      startupId,
      milestoneType,
      targetValue,
      prediction,
      betAmount,
      isResolved: false,
    });

    return this.betRepo.save(newBet);
  }

  async findByUserId(userId: string): Promise<Bet[]> {
    const bets = await this.betRepo.find({
      where: { userId },
      relations: { startup: true },
      order: { timestamp: 'DESC' },
    });

    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000; // 3 days expiration

    for (const bet of bets) {
      if (bet.isResolved || !bet.startup) continue;

      const startup = bet.startup;
      let currentVal = 0;
      if (bet.milestoneType === 'backers') currentVal = Number(startup.investorCount);
      else if (bet.milestoneType === 'raised') currentVal = Number(startup.totalRaised);
      else if (bet.milestoneType === 'price') currentVal = Number(startup.currentPrice);

      const target = Number(bet.targetValue);
      const isTargetReached = currentVal >= target;
      const isExpired = (now.getTime() - new Date(bet.timestamp).getTime()) >= threeDaysMs;

      let shouldResolve = false;
      let won = false;

      if (isTargetReached) {
        // YES wins immediately
        shouldResolve = true;
        won = bet.prediction === 'yes';
      } else if (isExpired) {
        // NO wins since expiration reached without hitting target
        shouldResolve = true;
        won = bet.prediction === 'no';
      }

      if (shouldResolve) {
        bet.isResolved = true;
        bet.won = won;
        bet.payout = won ? Number(bet.betAmount) * 2 : 0;
        await this.betRepo.save(bet);

        // Credit user wallet if they won
        if (won) {
          const user = await this.userRepo.findOneBy({ id: userId });
          if (user) {
            user.walletBalance = Number(user.walletBalance) + Number(bet.payout);
            await this.userRepo.save(user);
          }
        }
      }
    }

    return bets;
  }
}
