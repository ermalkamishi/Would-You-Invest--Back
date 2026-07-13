import { Injectable } from '@nestjs/common';
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
        existing.amountInvested = parseFloat((existing.amountInvested + amountInvested).toFixed(2));
        existing.sharesBought = parseFloat((existing.sharesBought + sharesBought).toFixed(4));
        // Average entry price
        existing.entryPrice = parseFloat(((existing.entryPrice * (existing.sharesBought - sharesBought) + Number(inv.entryPrice) * sharesBought) / existing.sharesBought).toFixed(4));
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

  create(createInvestmentDto: CreateInvestmentDto) {
    return 'This action adds a new investment';
  }

  findAll() {
    return `This action returns all investments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} investment`;
  }

  update(id: number, updateInvestmentDto: UpdateInvestmentDto) {
    return `This action updates a #${id} investment`;
  }

  remove(id: number) {
    return `This action removes a #${id} investment`;
  }
}
