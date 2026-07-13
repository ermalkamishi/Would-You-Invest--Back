import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async signToken(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = await this.jwtService.signAsync(payload);
    const enrichedUser = await this.usersService.findOne(user.id);
    return { access_token, user: enrichedUser };
  }

  async register(email: string, username: string, role: string, password: string, referrer?: string) {
    const cleanedEmail = email?.trim().toLowerCase();
    const cleanedUsername = username?.trim().toLowerCase();

    // 1. Legit email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanedEmail || !emailRegex.test(cleanedEmail)) {
      throw new BadRequestException('Please enter a valid email address');
    }

    // 2. Username validations
    if (!cleanedUsername || cleanedUsername.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters');
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(cleanedUsername)) {
      throw new BadRequestException('Username can only contain letters, numbers, and underscores');
    }

    const existingUsername = await this.userRepo.findOneBy({ username: cleanedUsername });
    if (existingUsername) {
      throw new BadRequestException('Username is already taken');
    }

    const existingEmail = await this.userRepo.findOneBy({ email: cleanedEmail });
    if (existingEmail) {
      throw new BadRequestException('User with this email already exists');
    }

    // 3. Password strength check
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(password)) {
      throw new BadRequestException('Password must contain at least one special character (!@#$%^&*, etc.)');
    }

    let walletBalance = role === 'founder' ? 0 : 10000;
    let finalRole = role || 'investor';

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (adminEmail && cleanedEmail === adminEmail.toLowerCase()) {
      finalRole = 'admin';
      walletBalance = 999999;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = this.userRepo.create({
      email: cleanedEmail,
      username: cleanedUsername,
      role: finalRole,
      passwordHash,
      walletBalance,
      lastResetAt: new Date(),
    });

    const saved = await this.userRepo.save(newUser);
    try {
      await this.usersService.processReferralSignup(saved.email, referrer);
    } catch (err) {
      console.error('Failed to process referral signup:', err);
    }
    const tokenData = await this.signToken(saved);
    return { ...tokenData, isNew: true };
  }

  async login(email: string, password?: string) {
    const user = await this.userRepo.findOneBy({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!password) {
      throw new UnauthorizedException('Password is required');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.checkWeeklyReset(user);
    return this.signToken(user);
  }

  async getMetrics() {
    const totalUsers = await this.userRepo.count();

    const result = await this.userRepo
      .createQueryBuilder('user')
      .select('SUM(user.walletBalance)', 'total')
      .getRawOne();

    const circulatingCapital = Number(result.total) || 0;

    return {
      totalUsers,
      activeUsers: totalUsers,
      circulatingCapital,
    };
  }

  async claimStipend(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const now = new Date();
    if (user.lastStipendClaimedAt) {
      const lastClaimed = new Date(user.lastStipendClaimedAt);
      const diffMs = now.getTime() - lastClaimed.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        const remainingHours = Math.ceil(24 - diffHours);
        throw new UnauthorizedException(
          `Daily stipend cooldown active. Try again in ${remainingHours} hours.`,
        );
      }
    }

    user.walletBalance = Number(user.walletBalance) + 1000;
    user.lastStipendClaimedAt = now;

    await this.userRepo.save(user);

    return {
      walletBalance: Number(user.walletBalance),
      lastStipendClaimedAt: user.lastStipendClaimedAt,
    };
  }
}
