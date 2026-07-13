import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Startup } from '../../startups/entities/startup.entity';

@Entity('bets')
export class Bet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Startup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'startupId' })
  startup: Startup;

  @Column()
  startupId: string;

  // Type of milestone: 'backers' | 'raised' | 'price'
  @Column()
  milestoneType: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  targetValue: number;

  @Column()
  prediction: string; // 'yes' | 'no'

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  betAmount: number;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ nullable: true })
  won: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  payout: number;

  @CreateDateColumn()
  timestamp: Date;
}
