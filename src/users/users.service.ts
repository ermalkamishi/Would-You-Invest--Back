import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { Investment } from '../investments/entities/investment.entity';
import { Startup } from '../startups/entities/startup.entity';
import { Referral } from './entities/referral.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
  ) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return this.userRepo.find();
  }

  async getLeaderboardByRoi() {
    const users = await this.userRepo.find({ where: { role: 'investor' } });
    const startups = await this.userRepo.manager.find(Startup);
    const sortedStartups = [...startups].sort((a, b) => Number(b.totalRaised) - Number(a.totalRaised));
    const topTenIds = sortedStartups.slice(0, 10).map((s) => s.id);

    const leaderboard = [];

    for (const user of users) {
      const investments = await this.userRepo.manager.find(Investment, {
        where: { userId: user.id },
        relations: { startup: true },
      });

      if (investments.length === 0) {
        leaderboard.push({
          id: user.id,
          username: user.username,
          roi: 0,
          investmentCount: 0,
        });
        continue;
      }

      let totalInvested = 0;
      let totalValue = 0;

      for (const inv of investments) {
        totalInvested += Number(inv.amountInvested);
        const rawValue = Number(inv.sharesBought) * Number(inv.startup?.currentPrice || 0);
        const isTopTen = topTenIds.includes(inv.startupId);
        totalValue += isTopTen ? rawValue * 1.2 : rawValue;
      }

      const roiPercent = totalInvested > 0 
        ? ((totalValue - totalInvested) / totalInvested) * 100 
        : 0;

      leaderboard.push({
        id: user.id,
        username: user.username,
        roi: parseFloat(roiPercent.toFixed(2)),
        investmentCount: investments.length,
      });
    }

    return leaderboard.sort((a, b) => b.roi - a.roi);
  }

  async checkWeeklyReset(user: User): Promise<boolean> {
    if (user.role === 'founder' || user.role === 'admin') return false;

    const now = new Date();
    // Monday at 00:00:00 is start of week
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const lastReset = user.lastResetAt ? new Date(user.lastResetAt) : null;

    if (!lastReset || lastReset < startOfWeek) {
      user.walletBalance = 10000;
      user.lastResetAt = new Date();
      
      // Save updated user first
      await this.userRepo.save(user);
      
      // Delete user investments
      await this.investmentRepo.delete({ userId: user.id });
      
      return true;
    }
    return false;
  }

  async claimReferral(userId: string, friendEmail: string): Promise<User> {
    const user = await this.findOne(userId);
    const cleanedEmail = friendEmail.trim().toLowerCase();

    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }

    if (cleanedEmail === user.email.toLowerCase()) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const existingUser = await this.userRepo.findOneBy({ email: cleanedEmail });
    if (existingUser) {
      throw new BadRequestException('This email is already registered on CapTab');
    }

    const existingReferral = await this.referralRepo.findOneBy({
      referrerId: userId,
      friendEmail: cleanedEmail,
    });
    if (existingReferral) {
      throw new BadRequestException('You have already invited this friend');
    }

    const newReferral = this.referralRepo.create({
      referrerId: userId,
      friendEmail: cleanedEmail,
      status: 'pending',
    });
    await this.referralRepo.save(newReferral);

    return user;
  }

  async processReferralSignup(email: string, referrerUsername?: string): Promise<void> {
    const cleanedEmail = email.trim().toLowerCase();

    // 1. Link-based signup if referrerUsername is provided
    if (referrerUsername) {
      const referrerUser = await this.userRepo.findOneBy({ username: referrerUsername });
      if (referrerUser && referrerUser.email.toLowerCase() !== cleanedEmail) {
        // Check if there is already an accepted referral for this friend
        const alreadyReferred = await this.referralRepo.findOneBy({
          friendEmail: cleanedEmail,
          status: 'accepted',
        });

        if (!alreadyReferred) {
          const existingReferral = await this.referralRepo.findOneBy({
            referrerId: referrerUser.id,
            friendEmail: cleanedEmail,
          });

          if (existingReferral) {
            existingReferral.status = 'accepted';
            await this.referralRepo.save(existingReferral);
          } else {
            const newReferral = this.referralRepo.create({
              referrerId: referrerUser.id,
              friendEmail: cleanedEmail,
              status: 'accepted',
            });
            await this.referralRepo.save(newReferral);
          }

          // Credit referrer
          referrerUser.walletBalance = Number(referrerUser.walletBalance) + 5000;
          await this.userRepo.save(referrerUser);
          return;
        }
      }
    }

    // 2. Email-based invite matching fallback
    const pendingReferrals = await this.referralRepo.find({
      where: {
        friendEmail: cleanedEmail,
        status: 'pending',
      },
    });

    for (const referral of pendingReferrals) {
      referral.status = 'accepted';
      await this.referralRepo.save(referral);

      const referrer = await this.userRepo.findOneBy({ id: referral.referrerId });
      if (referrer) {
        referrer.walletBalance = Number(referrer.walletBalance) + 5000;
        await this.userRepo.save(referrer);
      }
    }
  }

  async findOne(id: string): Promise<any> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    await this.checkWeeklyReset(user);

    // Get following list
    const followingRelations = await this.followRepo.find({
      where: { followerId: id },
      relations: { following: true },
    });
    const followedFounders = followingRelations.map((f) => f.following).filter(Boolean);

    // Get followers list
    const followerRelations = await this.followRepo.find({
      where: { followingId: id },
      relations: { follower: true },
    });
    const followers = followerRelations.map((f) => f.follower).filter(Boolean);

    return {
      ...user,
      followedFounders,
      followers,
    };
  }

  async followFounder(followerId: string, founderId: string): Promise<any> {
    if (followerId === founderId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const follower = await this.userRepo.findOneBy({ id: followerId });
    const founder = await this.userRepo.findOneBy({ id: founderId });
    if (!follower || !founder) {
      throw new NotFoundException('Follower or founder user not found');
    }

    const existing = await this.followRepo.findOne({
      where: { followerId, followingId: founderId },
    });

    if (!existing) {
      const follow = this.followRepo.create({ followerId, followingId: founderId });
      await this.followRepo.save(follow);
    }

    return this.findOne(followerId);
  }

  async unfollowFounder(followerId: string, founderId: string): Promise<any> {
    const existing = await this.followRepo.findOne({
      where: { followerId, followingId: founderId },
    });

    if (existing) {
      await this.followRepo.remove(existing);
    }

    return this.findOne(followerId);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const updated = this.userRepo.merge(user, updateUserDto);
    return this.userRepo.save(updated);
  }

  async remove(id: string): Promise<void> {
    await this.userRepo.delete(id);
  }
}
