import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Startup } from './entities/startup.entity';
import { CreateStartupDto } from './dto/create-startup.dto';
import { User } from '../users/entities/user.entity';
import { Investment } from '../investments/entities/investment.entity';

@Injectable()
export class StartupsService {
  constructor(
    @InjectRepository(Startup)
    private readonly startupRepo: Repository<Startup>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,
  ) {}

  async create(founderId: string, dto: CreateStartupDto): Promise<Startup> {
    // Rate limit: max 3 pitches per founder per calendar day
    if (founderId !== 'anonymous') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const pitchesToday = await this.startupRepo.count({
        where: {
          founderId,
        },
      });
      // Only count pitches created today via a raw query
      const todayCount = await this.startupRepo
        .createQueryBuilder('startup')
        .where('startup.founderId = :founderId', { founderId })
        .andWhere('startup.createdAt >= :todayStart', { todayStart })
        .getCount();

      if (todayCount >= 3) {
        throw new BadRequestException(
          'Rate limit: You can only submit 3 pitches per day. Come back tomorrow!',
        );
      }
    }

    const startup = this.startupRepo.create({
      ...dto,
      founderId,
      currentPrice: 0.01,
      totalRaised: 0,
      investorCount: 0,
    });
    return this.startupRepo.save(startup);
  }

  async findAll(sortBy = 'hot', allStatuses = false): Promise<Startup[]> {
    const query = this.startupRepo.createQueryBuilder('startup')
      .leftJoinAndSelect('startup.founder', 'founder')
      .leftJoinAndSelect('startup.comments', 'comments')
      .leftJoinAndSelect('comments.user', 'user');

    if (!allStatuses) {
      query.where('startup.status != :status', { status: 'takedown' });
    }

    if (sortBy === 'hot' || sortBy === 'funded') {
      query.orderBy('startup.totalRaised', 'DESC');
    } else if (sortBy === 'rising') {
      query.orderBy('startup.currentPrice', 'DESC');
    } else {
      query.orderBy('startup.createdAt', 'DESC');
    }

    query.addOrderBy('comments.createdAt', 'ASC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Startup> {
    const startup = await this.startupRepo.findOne({
      where: { id },
      relations: { founder: true, comments: { user: true } },
      order: {
        comments: {
          createdAt: 'ASC',
        },
      },
    });
    if (!startup) throw new NotFoundException('Startup not found');
    return startup;
  }

  /**
   * Processes an investment into a startup.
   * Updates totalRaised, investorCount, and current price (simple bonding curve).
   * Deducts from User wallet and creates an Investment record.
   */
  async invest(startupId: string, amount: number, userId: string): Promise<Startup> {
    const startup = await this.findOne(startupId);
    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (Number(user.walletBalance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const maxAllowed = Number(user.walletBalance) * 0.2;
    // Exclude admins from concentration limit for debugging/demo ease, but apply to normal investors
    if (user.role !== 'admin' && amount > maxAllowed) {
      throw new BadRequestException(`Concentration limit: max 20% of wallet in one idea (${maxAllowed.toFixed(2)}).`);
    }

    // Deduct from wallet
    user.walletBalance = Number(user.walletBalance) - amount;

    const currentPrice = Number(startup.currentPrice);
    const totalRaised = Number(startup.totalRaised);
    const nextTotalRaised = parseFloat((totalRaised + amount).toFixed(2));

    // Bonding curve: Price = 0.0015 * sqrt(TotalRaised)
    const k = 0.0015;
    const computedPrice = k * Math.sqrt(nextTotalRaised);
    const newPrice = parseFloat(Math.max(0.01, computedPrice).toFixed(4));

    // Update Startup
    startup.totalRaised = nextTotalRaised;
    startup.investorCount = startup.investorCount + 1;
    startup.currentPrice = newPrice;

    // Create Investment Record
    const sharesBought = amount / currentPrice;
    const investment = this.investmentRepo.create({
      userId,
      startupId,
      amountInvested: amount,
      entryPrice: currentPrice,
      sharesBought: parseFloat(sharesBought.toFixed(4)),
    });

    // Save all changes
    await this.userRepo.save(user);
    await this.investmentRepo.save(investment);
    return this.startupRepo.save(startup);
  }

  /**
   * Updates the status of a startup (e.g. 'verified', 'takedown')
   */
  async updateStatus(id: string, status: string): Promise<Startup> {
    const startup = await this.findOne(id);
    startup.status = status;
    return this.startupRepo.save(startup);
  }

  async submitPassReason(id: string, reason: string): Promise<Startup> {
    const startup = await this.findOne(id);
    if (!reason || reason.trim() === '') return startup;

    const reasons = startup.passReasons || {};
    reasons[reason] = (reasons[reason] || 0) + 1;
    startup.passReasons = reasons;

    return this.startupRepo.save(startup);
  }

  async addUpdate(id: string, founderId: string, text: string): Promise<Startup> {
    const startup = await this.findOne(id);
    if (startup.founderId !== founderId) {
      throw new ForbiddenException('Only the founder can post updates');
    }
    if (!text || text.trim() === '') {
      throw new BadRequestException('Update text cannot be empty');
    }

    const updates = startup.updates || [];
    updates.push({
      text: text.trim(),
      createdAt: new Date(),
    });
    startup.updates = updates;

    return this.startupRepo.save(startup);
  }

  async remove(id: string): Promise<void> {
    await this.startupRepo.delete(id);
  }
}
