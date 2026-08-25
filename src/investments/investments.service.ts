import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Investment } from './entities/investment.entity';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,
  ) {}

  async findByUserId(userId: string) {
    const investments = await this.investmentRepo.find({
      where: { userId },
      relations: { startup: true },
    });

    const portfolioMap = new Map<string, any>();
    for (const inv of investments) {
      if (!inv.startup) continue;

      const existing = portfolioMap.get(inv.startupId);
      const amountInvested = Number(inv.amountInvested);
      const sharesBought = Number(inv.sharesBought);

      if (existing) {
        existing.amountInvested = parseFloat(
          (existing.amountInvested + amountInvested).toFixed(2),
        );
        existing.sharesBought = parseFloat(
          (existing.sharesBought + sharesBought).toFixed(4),
        );
        // Average entry price
        existing.entryPrice = parseFloat(
          (
            (existing.entryPrice * (existing.sharesBought - sharesBought) +
              Number(inv.entryPrice) * sharesBought) /
            existing.sharesBought
          ).toFixed(4),
        );
      } else {
        portfolioMap.set(inv.startupId, {
          id: inv.startup.id,
          problem: inv.startup.problem,
          category: inv.startup.category,
          entryPrice: Number(inv.entryPrice),
          currentPrice: Number(inv.startup.currentPrice),
          sharesBought,
          amountInvested,
        });
      }
    }

    return Array.from(portfolioMap.values());
  }

  async create(createInvestmentDto: CreateInvestmentDto): Promise<Investment> {
    const investment = this.investmentRepo.create(createInvestmentDto);
    return this.investmentRepo.save(investment);
  }

  async findByStartupId(startupId: string) {
    return this.investmentRepo.find({
      where: { startupId },
      order: { timestamp: 'ASC' },
    });
  }

  async findAll() {
    return this.investmentRepo.find({
      relations: { startup: true },
      order: { timestamp: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Investment> {
    const inv = await this.investmentRepo.findOne({
      where: { id },
      relations: { startup: true, user: true },
    });
    if (!inv) throw new NotFoundException('Investment not found');
    return inv;
  }

  async update(
    id: string,
    updateInvestmentDto: UpdateInvestmentDto,
  ): Promise<Investment> {
    const inv = await this.findOne(id);
    const updated = this.investmentRepo.merge(inv, updateInvestmentDto);
    return this.investmentRepo.save(updated);
  }

  async remove(id: string): Promise<void> {
    await this.investmentRepo.delete(id);
  }
}
