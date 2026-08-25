import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const faker = require('@faker-js/faker').faker;
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { Startup } from '../startups/entities/startup.entity';
import { Investment } from '../investments/entities/investment.entity';
import { Comment } from '../comments/entities/comment.entity';

const REALISTIC_PITCH_TEMPLATES = [
  {
    problem:
      'Software teams spend 30% of sprint time writing documentation and manual API tests.',
    solution:
      'AI agent that automatically writes integration tests and maintains documentation directly from pull requests.',
    whoPays: 'B2B SaaS engineering teams ($99/developer/month).',
    whyNow:
      'LLM context windows and tool-calling capabilities reached production readiness in 2025.',
    ask: '$300,000 for 12 months of runway.',
    category: 'AI',
    demoClipUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tractionSnapshot: '30 beta teams on waitlist, 5 paying design partners.',
  },
  {
    problem:
      'E-commerce brands lose 15% of revenue to return fraud and bracket shopping.',
    solution:
      'Predictive return risk scoring API for Shopify checkout that flags suspicious accounts before shipping.',
    whoPays: 'DTC e-commerce merchants doing >$1M GMV.',
    whyNow:
      'Online return rates surged to 24% in 2025, costing brands billions.',
    ask: '$500,000 seed round.',
    category: 'Fintech',
    demoClipUrl: '',
    tractionSnapshot: '$4.2k MRR, 12 active Shopify Plus stores.',
  },
  {
    problem:
      'Commercial buildings waste up to 40% of energy on HVAC due to static schedules.',
    solution:
      'IoT sensor network + ML controller that dynamically adjusts heating and cooling based on real-time occupancy.',
    whoPays: 'Commercial property managers and office building owners.',
    whyNow:
      'New EU and US carbon compliance laws impose steep penalties starting 2026.',
    ask: '$750,000 seed round.',
    category: 'Climate',
    demoClipUrl: '',
    tractionSnapshot:
      '2 office towers piloted, 34% documented energy reduction.',
  },
  {
    problem:
      'Creators struggle to monetize short-form video audiences without sponsorships.',
    solution:
      'Micro-tipping platform where fans unlock exclusive 15-second bonus clips for $0.50.',
    whoPays:
      'Gen-Z consumers & TikTok creators taking a 10% platform fee split.',
    whyNow: 'Micropayments are finally viable with instant digital wallets.',
    ask: '$250,000 pre-seed.',
    category: 'Consumer',
    demoClipUrl: '',
    tractionSnapshot:
      '15,000 registered fans, $12k processed volume in month 1.',
  },
  {
    problem:
      'Healthcare clinics waste hours managing patient follow-ups and prescription renewals.',
    solution:
      'Voice-AI assistant that calls patients post-op, logs symptoms, and syncs directly with EHR systems.',
    whoPays: 'Outpatient surgery clinics and private practices.',
    whyNow: 'HIPAA-compliant voice AI models just reached 99.2% accuracy.',
    ask: '$600,000 seed funding.',
    category: 'Health',
    demoClipUrl: '',
    tractionSnapshot:
      '8 clinic contracts signed, 1,200 automated calls completed.',
  },
  {
    problem:
      'Solana and Ethereum cross-chain swaps take multiple steps and high slippage.',
    solution:
      'Zero-knowledge cross-chain liquidity protocol for instant 1-click token swaps with zero bridge exposure.',
    whoPays: 'DeFi traders via 0.1% swap protocol fee.',
    whyNow: 'ZK-rollups achieved sub-second finality performance.',
    ask: '$1,000,000 seed round.',
    category: 'Crypto',
    demoClipUrl: '',
    tractionSnapshot: '$2.5M testnet volume, 8,000 community members.',
  },
  {
    problem: 'Remote employees feel disconnected during async onboarding.',
    solution:
      'Gamified virtual HQ where new hires solve onboarding quests and interact with teammates in 3D.',
    whoPays: 'HR leaders at remote-first companies with >50 employees.',
    whyNow:
      'Remote work stabilized as permanent standard, but 90-day retention fell by 18%.',
    ask: '$400,000 seed round.',
    category: 'B2B',
    demoClipUrl: '',
    tractionSnapshot: '14 paid pilots, 92% 30-day employee activation.',
  },
  {
    problem:
      'High school students lack personalized tutoring for SAT/ACT prep.',
    solution:
      'AI tutor that adapts question difficulty in real time and predicts test score improvements with 95% accuracy.',
    whoPays: 'Parents via $29/month subscription.',
    whyNow:
      'Adaptive learning models outperform traditional test prep courses at 1/10th the price.',
    ask: '$350,000 pre-seed.',
    category: 'Education',
    demoClipUrl: '',
    tractionSnapshot:
      '2,400 active students, average 140-point SAT score increase.',
  },
];

const REALISTIC_COMMENTS_BY_CATEGORY: Record<string, string[]> = {
  AI: [
    "What's your strategy for inference latency and API cost optimization as token usage scales?",
    'Do you train on proprietary enterprise data or use zero-retention API endpoints?',
    'Solid context window management. How are you handling hallucination edge cases in production?',
    'The automated test generation looks slick. Is there support for custom CI/CD pipelines like GitHub Actions?',
    'How does the model handle multi-file context dependencies across large codebases?',
  ],
  Fintech: [
    'Which banking partner or payment rail processor are you integrated with?',
    'How are you mitigating chargebacks and return fraud risks under the hood?',
    'What is your gross margin per transaction after payment gateway fees?',
    'Love the predictive risk scoring. Does it integrate natively with Shopify Plus checkout?',
    'Are you compliant with PCI-DSS Level 1 and regional privacy regulations?',
  ],
  Climate: [
    "What's the average payback period for commercial building owners installing these sensors?",
    'Are there government green energy grants or LEED credits driving customer adoption?',
    'How does the IoT hardware handle network dropouts or power outages?',
    "Impressive 34% energy reduction in pilot testing! What's the maintenance cycle for the hardware?",
  ],
  Consumer: [
    "What's your organic virality K-factor among creator networks right now?",
    'Super high engagement numbers! What does your 30-day user retention cohort look like?',
    'How are you handling micro-transaction fee splits with App Store / Play Store rules?',
    'The 15-second bonus clip unlocking is clever. Great incentive loop for fans!',
  ],
  Health: [
    'How fast is the onboarding process for clinic staff, and does it sync with Epic/Cerner EHRs?',
    'Has the voice assistant undergone HIPAA third-party compliance auditing?',
    'What is the accuracy rate on complex medical terminology and multi-lingual calls?',
    '99.2% voice accuracy is stellar. How do you handle emergency escalation protocols?',
  ],
  Crypto: [
    'Have the ZK smart contracts completed formal verification and audits by top-tier firms?',
    'What is the average gas fee overhead per cross-chain swap?',
    'Zero-knowledge cross-chain liquidity without bridge risk is huge if battle-tested.',
    'How do you handle slippage during periods of extreme high-network volatility?',
  ],
  B2B: [
    'What does the onboarding ramp look like for enterprise teams with 500+ employees?',
    'Are deals currently closed via self-serve PLG or high-touch outbound enterprise sales?',
    'How do you measure employee activation rate during the first 90 days of onboarding?',
    'The 3D virtual HQ concept is fun. How is browser performance on standard corporate laptops?',
  ],
  Education: [
    "What's the average score increase for students after 4 weeks of adaptive tutoring?",
    'Are you partnering directly with school districts or focusing on D2C parent subscriptions?',
    'How does the AI adapt question difficulty when a student hits a learning plateau?',
    '140-point average SAT increase is a massive selling point for parents. Fantastic traction!',
  ],
};

const DIVERSE_GENERAL_COMMENTS = [
  'What is your current CAC payback period, and how is it trending over the last quarter?',
  'Strong founder-market fit here. What is your #1 strategic priority for this round?',
  'Love the product deck clarity. How big is the total addressable market in year 3?',
  'How are you defending against potential fast-followers or incumbent platforms?',
  'Just allocated $2,500 into this pitch. The traction metrics speak for themselves!',
  'What does your current monthly net burn look like with this raise included?',
  "Great presentation! Added this to my top watchlist for this week's cohort.",
  'What is the current churn rate among your early paying design partners?',
  'Are you planning to build an in-house sales team or scale via strategic channel partnerships?',
  'Super compelling problem statement. The unit economics make a ton of sense.',
  'How long did it take to build the initial v1 MVP before launching pilots?',
  'Very clear value proposition. Excited to follow your milestone updates!',
  'What has been the biggest bottleneck to customer acquisition so far?',
  'Solid execution team. Do you have any advisory board members with deep industry domain background?',
  'Will this round be sufficient to reach net cash flow positivity or will you need Series A?',
];

const getRandomUniqueComment = (
  category?: string,
  existingTexts: Set<string> = new Set(),
  username?: string,
): string => {
  const categoryPool =
    category && REALISTIC_COMMENTS_BY_CATEGORY[category]
      ? REALISTIC_COMMENTS_BY_CATEGORY[category]
      : [];
  const fullPool = [...categoryPool, ...DIVERSE_GENERAL_COMMENTS];

  const available = fullPool.filter((text) => !existingTexts.has(text));

  if (available.length > 0) {
    const chosen = faker.helpers.arrayElement(available);
    existingTexts.add(chosen);
    return chosen;
  }

  const tag = username ? `@${username}` : 'Operator';
  const custom = `${tag} update: Highly promising traction on the ${category || 'startup'} metrics!`;
  existingTexts.add(custom);
  return custom;
};

const ALBANIAN_FOUNDER_USERNAMES = [
  'ermal_k',
  'arben_tech',
  'gentian_dev',
  'valon_b',
  'besart_ventures',
  'drilon_m',
  'agron_builds',
  'liridon_labs',
  'taulant_ai',
  'teuta_ventures',
  'rozafa_tech',
  'doruntina_dev',
  'era_digital',
  'bora_labs',
  'zana_vc',
];

const MACEDONIAN_FOUNDER_USERNAMES = [
  'marko_tech',
  'stefan_labs',
  'trajche_dev',
  'nikola_ai',
  'bojan_builds',
  'goran_ventures',
  'filip_m',
  'blagoj_saas',
  'elena_innovates',
  'ivana_studio',
  'angela_tech',
  'viktorija_ai',
];

const WORLDWIDE_FOUNDER_USERNAMES = [
  'marcus_dev',
  'sarah_ai',
  'chen_labs',
  'hiroshi_tech',
  'lucas_builder',
  'mateo_saas',
  'emma_innovates',
  'julian_vc',
  'maya_labs',
  'david_code',
  'noah_ventures',
  'sophia_tech',
  'alex_found',
  'oliver_builds',
];

const ALBANIAN_INVESTOR_USERNAMES = [
  'ylli_cap',
  'ilir_invests',
  'gent_vc',
  'blerim_angel',
  'agim_capital',
  'artina_funds',
  'altin_growth',
  'dardan_holdings',
  'vlora_vc',
  'shpend_invest',
];

const MACEDONIAN_INVESTOR_USERNAMES = [
  'aleksandar_vc',
  'petar_capital',
  'dejan_funds',
  'simona_angel',
  'darko_invest',
  'milan_equity',
  'kristijan_cap',
  'zoran_angel',
];

const WORLDWIDE_INVESTOR_USERNAMES = [
  'oliver_cap',
  'chloe_vc',
  'liam_invests',
  'isabella_fund',
  'leo_growth',
  'ethan_angel',
  'aria_holdings',
  'jack_venture',
  'noah_capital',
  'hannah_vc',
];

const getRandomFounderUsername = () => {
  const pool = [
    ...ALBANIAN_FOUNDER_USERNAMES,
    ...MACEDONIAN_FOUNDER_USERNAMES,
    ...WORLDWIDE_FOUNDER_USERNAMES,
  ];
  const base = faker.helpers.arrayElement(pool);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}_${suffix}`;
};

const getRandomInvestorUsername = () => {
  const pool = [
    ...ALBANIAN_INVESTOR_USERNAMES,
    ...MACEDONIAN_INVESTOR_USERNAMES,
    ...WORLDWIDE_INVESTOR_USERNAMES,
  ];
  const base = faker.helpers.arrayElement(pool);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}_${suffix}`;
};

@Injectable()
export class SimulatorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Startup)
    private readonly startupRepo: Repository<Startup>,
    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking simulator status...');
    await this.cleanupLegacyUsernames();
    await this.bootstrapInitialDataIfNeeded();
    await this.deduplicateAndEnrichComments();
  }

  /**
   * Scans all existing comments in database and ensures every comment is realistic, unique, and not duplicated
   */
  private async deduplicateAndEnrichComments() {
    try {
      const startups = await this.startupRepo.find({
        relations: { comments: { user: true } },
      });

      const legacyGenericComments = [
        'Solid problem statement. How big is the TAM here?',
        'Backing this one! The traction snapshot looks super promising.',
        'Love the vision behind this. Just bought 500 shares!',
        'Interesting concept. Who are your biggest direct competitors right now?',
        'The solution seems really timely with current market trends.',
        'Great pitch! Added this startup to my primary portfolio.',
        'Who pays section makes total sense. Good luck founder!',
        'Huge market opportunity. Definitely keeping an eye on this price curve.',
      ];

      for (const startup of startups) {
        if (!startup.comments || startup.comments.length === 0) continue;

        const seenTexts = new Set<string>();

        for (const comment of startup.comments) {
          const isGenericLegacy = legacyGenericComments.includes(comment.text);

          if (seenTexts.has(comment.text) || isGenericLegacy) {
            const newText = getRandomUniqueComment(
              startup.category,
              seenTexts,
              comment.user?.username,
            );
            comment.text = newText;
            await this.commentRepo.save(comment);
            this.logger.log(
              `Enriched comment ID ${comment.id} for startup "${startup.problem.slice(0, 20)}..." -> "${newText}"`,
            );
          } else {
            seenTexts.add(comment.text);
          }
        }
      }
    } catch (err) {
      this.logger.error('Error during comment deduplication/enrichment:', err);
    }
  }

  /**
   * Cleans up old 'founder_...' and 'investor_...' prefixed usernames in DB to realistic names
   */
  private async cleanupLegacyUsernames() {
    try {
      const legacyUsers = await this.userRepo.find();
      for (const u of legacyUsers) {
        if (
          u.username.startsWith('founder_') ||
          u.username.startsWith('investor_')
        ) {
          const isFounder =
            u.role === 'founder' || u.username.startsWith('founder_');
          const newUsername = isFounder
            ? getRandomFounderUsername()
            : getRandomInvestorUsername();
          u.username = newUsername;
          try {
            await this.userRepo.save(u);
            this.logger.log(
              `Cleaned up legacy username -> updated to @${u.username}`,
            );
          } catch (e) {
            // Ignore collision fallback
          }
        }
      }
    } catch (err) {
      this.logger.error('Error cleaning up legacy usernames:', err);
    }
  }

  /**
   * Ensures the database has initial simulated activity on startup
   */
  private async bootstrapInitialDataIfNeeded() {
    const startupCount = await this.startupRepo.count();
    const userCount = await this.userRepo.count();

    if (startupCount >= 4 && userCount >= 6) {
      this.logger.log(
        `Database already has ${startupCount} startups and ${userCount} users. Simulator running in background mode.`,
      );
      return;
    }

    this.logger.log(
      'Seeding initial simulated ecosystem (founders, pitches, investors, and investment histories)...',
    );

    // 1. Create simulated founder accounts
    const defaultPasswordHash = await bcrypt.hash('botpassword123', 10);
    const founders: User[] = [];

    const founderUsernamesPool = [
      'ermal_k_24',
      'marko_tech_91',
      'arben_dev_33',
      'sarah_ai_88',
      'besart_ventures_12',
    ];

    for (let i = 0; i < 5; i++) {
      const username = founderUsernamesPool[i] || getRandomFounderUsername();
      const founder = this.userRepo.create({
        username,
        email: `${username}@gmail.com`,
        passwordHash: defaultPasswordHash,
        role: 'founder',
        bio: faker.person.bio(),
        walletBalance: 10000,
        avatarUrl: faker.image.avatar(),
        badges: i % 2 === 0 ? ['Verified Builder'] : ['First-time Founder'],
      });
      founders.push(await this.userRepo.save(founder));
    }

    // 2. Create simulated investor accounts
    const investors: User[] = [];
    const investorUsernamesPool = [
      'ylli_cap_45',
      'aleksandar_vc_77',
      'liam_invests_19',
      'gent_vc_82',
      'petar_capital_34',
      'oliver_cap_66',
      'drilon_invest_53',
      'simona_angel_90',
    ];

    for (let i = 0; i < 8; i++) {
      const username = investorUsernamesPool[i] || getRandomInvestorUsername();
      const investor = this.userRepo.create({
        username,
        email: `${username}@gmail.com`,
        passwordHash: defaultPasswordHash,
        role: 'investor',
        bio: faker.person.bio(),
        walletBalance: faker.number.int({ min: 5000, max: 25000 }),
        avatarUrl: faker.image.avatar(),
      });
      investors.push(await this.userRepo.save(investor));
    }

    // 3. Create initial startup pitches
    const createdStartups: Startup[] = [];
    for (let i = 0; i < REALISTIC_PITCH_TEMPLATES.length; i++) {
      const template = REALISTIC_PITCH_TEMPLATES[i];
      const founder = founders[i % founders.length];

      const startup = this.startupRepo.create({
        ...template,
        founderId: founder.id,
        currentPrice: 0.01,
        totalRaised: 0,
        investorCount: 0,
        createdAt: faker.date.recent({ days: 20 }),
      });
      createdStartups.push(await this.startupRepo.save(startup));
    }

    // 4. Create historical investments to generate curved charts
    for (const startup of createdStartups) {
      const numInvestments = faker.number.int({ min: 3, max: 7 });
      let currentTotalRaised = 0;

      for (let j = 0; j < numInvestments; j++) {
        const investor = investors[j % investors.length];
        const amount = faker.number.int({ min: 200, max: 1500 });

        const entryPrice = Math.max(
          0.01,
          parseFloat((0.0015 * Math.sqrt(currentTotalRaised)).toFixed(4)),
        );
        currentTotalRaised += amount;
        const newPrice = Math.max(
          0.01,
          parseFloat((0.0015 * Math.sqrt(currentTotalRaised)).toFixed(4)),
        );

        startup.totalRaised = parseFloat(currentTotalRaised.toFixed(2));
        startup.investorCount += 1;
        startup.currentPrice = newPrice;

        const investment = this.investmentRepo.create({
          userId: investor.id,
          startupId: startup.id,
          amountInvested: amount,
          entryPrice: entryPrice,
          sharesBought: parseFloat((amount / entryPrice).toFixed(4)),
          timestamp: faker.date.between({
            from: startup.createdAt,
            to: new Date(),
          }),
        });

        await this.investmentRepo.save(investment);
      }

      await this.startupRepo.save(startup);

      // Add a couple of unique comments
      const commentCount = faker.number.int({ min: 1, max: 3 });
      const usedTexts = new Set<string>();
      for (let c = 0; c < commentCount; c++) {
        const commenter = investors[(c + 2) % investors.length];
        const text = getRandomUniqueComment(
          startup.category,
          usedTexts,
          commenter.username,
        );
        const comment = this.commentRepo.create({
          startupId: startup.id,
          userId: commenter.id,
          text,
          upvotedBy: [commenter.id],
        });
        await this.commentRepo.save(comment);
      }
    }

    this.logger.log('Initial simulated ecosystem created successfully!');
  }

  /**
   * Cron job that runs every 2 minutes to perform autonomous live simulated activity
   */
  @Cron('*/2 * * * *')
  async performLiveSimulatedAction() {
    try {
      const roll = Math.random();

      if (roll < 0.6) {
        // 60% chance: Simulated investment in a pitch (updates live price, charts, and totals)
        await this.simulateInvestment();
      } else if (roll < 0.75) {
        // 15% chance: Simulated comment on a pitch
        await this.simulateComment();
      } else if (roll < 0.9) {
        // 15% chance: Create a new simulated user account (Founder or Investor)
        await this.simulateNewUser();
      } else {
        // 10% chance: Simulated Founder posts a new pitch
        await this.simulateNewPitch();
      }
    } catch (err) {
      this.logger.error('Error during simulated live action:', err);
    }
  }

  private async simulateInvestment() {
    const investors = await this.userRepo.find({ take: 20 });
    const startups = await this.startupRepo.find({
      where: { status: 'active' },
      take: 20,
    });

    if (investors.length === 0 || startups.length === 0) return;

    const investor = faker.helpers.arrayElement(investors);
    const startup = faker.helpers.arrayElement(startups);

    const amount = faker.number.int({ min: 100, max: 1000 });

    // Make sure investor has enough wallet balance
    if (Number(investor.walletBalance) < amount) {
      investor.walletBalance = Number(investor.walletBalance) + 5000;
      await this.userRepo.save(investor);
    }

    const currentPrice = Number(startup.currentPrice);
    const totalRaised = Number(startup.totalRaised);
    const nextTotalRaised = parseFloat((totalRaised + amount).toFixed(2));

    // Bonding curve pricing
    const k = 0.0015;
    const computedPrice = k * Math.sqrt(nextTotalRaised);
    const newPrice = parseFloat(Math.max(0.01, computedPrice).toFixed(4));

    // Deduct wallet balance
    investor.walletBalance = Number(investor.walletBalance) - amount;

    // Update Startup stats
    startup.totalRaised = nextTotalRaised;
    startup.investorCount += 1;
    startup.currentPrice = newPrice;

    // Create Investment record
    const investment = this.investmentRepo.create({
      userId: investor.id,
      startupId: startup.id,
      amountInvested: amount,
      entryPrice: currentPrice,
      sharesBought: parseFloat((amount / currentPrice).toFixed(4)),
    });

    await this.userRepo.save(investor);
    await this.investmentRepo.save(investment);
    await this.startupRepo.save(startup);

    this.logger.log(
      `🤖 Live Simulator: @${investor.username} invested $${amount} into "${startup.problem.slice(0, 30)}..." (New Price: $${newPrice})`,
    );
  }

  private async simulateComment() {
    const users = await this.userRepo.find({ take: 15 });
    const startups = await this.startupRepo.find({
      take: 15,
      relations: { comments: true },
    });

    if (users.length === 0 || startups.length === 0) return;

    const user = faker.helpers.arrayElement(users);
    const startup = faker.helpers.arrayElement(startups);

    const existingTexts = new Set<string>(
      (startup.comments || []).map((c: any) => c.text),
    );
    const text = getRandomUniqueComment(
      startup.category,
      existingTexts,
      user.username,
    );

    const comment = this.commentRepo.create({
      startupId: startup.id,
      userId: user.id,
      text,
      upvotedBy: [],
    });

    await this.commentRepo.save(comment);
    this.logger.log(
      `🤖 Live Simulator: @${user.username} commented on "${startup.problem.slice(0, 30)}...": "${text}"`,
    );
  }

  private async simulateNewUser() {
    const isFounder = Math.random() < 0.3;
    const role = isFounder ? 'founder' : 'investor';
    const passwordHash = await bcrypt.hash('botpassword123', 10);
    const username = isFounder
      ? getRandomFounderUsername()
      : getRandomInvestorUsername();

    const newUser = this.userRepo.create({
      username,
      email: `${username}@gmail.com`,
      passwordHash,
      role,
      bio: faker.person.bio(),
      walletBalance:
        role === 'investor'
          ? faker.number.int({ min: 5000, max: 20000 })
          : 10000,
      avatarUrl: faker.image.avatar(),
      badges: isFounder ? ['Verified Builder'] : [],
    });

    await this.userRepo.save(newUser);
    this.logger.log(
      `🤖 Live Simulator: Created new ${role} account @${newUser.username}`,
    );
  }

  private async simulateNewPitch() {
    const founders = await this.userRepo.find({
      where: { role: 'founder' },
      take: 10,
    });
    if (founders.length === 0) return;

    const founder = faker.helpers.arrayElement(founders);
    const category = faker.helpers.arrayElement([
      'AI',
      'Fintech',
      'Climate',
      'Consumer',
      'Health',
      'B2B',
    ]);
    const company = faker.company.name();

    const newPitch = this.startupRepo.create({
      problem: `Traditional ${faker.company.buzzNoun()} processes take weeks and waste thousands of dollars.`,
      solution: `${company} provides an automated platform to streamline ${faker.company.buzzAdjective()} workflows in seconds.`,
      whoPays: `${category} enterprises & growing SMBs ($499/mo).`,
      whyNow: `Recent regulatory changes and AI adoption reached tipping point in ${new Date().getFullYear()}.`,
      ask: `$${faker.number.int({ min: 250, max: 800 })}k for product development and hiring key engineers.`,
      category,
      currentPrice: 0.01,
      totalRaised: 0,
      investorCount: 0,
      founderId: founder.id,
      tractionSnapshot: `${faker.number.int({ min: 5, max: 25 })} active pilot customers.`,
    });

    await this.startupRepo.save(newPitch);
    this.logger.log(
      `🤖 Live Simulator: Founder @${founder.username} published new pitch in ${category}!`,
    );
  }
}
