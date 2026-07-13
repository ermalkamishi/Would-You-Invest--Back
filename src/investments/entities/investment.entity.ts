import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Startup } from '../../startups/entities/startup.entity';

@Entity('investments')
export class Investment {
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

  // The total fake money amount invested in this transaction
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amountInvested: number;

  // The share price at the exact moment of investment
  @Column({ type: 'decimal', precision: 12, scale: 4 })
  entryPrice: number;

  // How many virtual shares this investment purchased (amountInvested / entryPrice)
  @Column({ type: 'decimal', precision: 12, scale: 4 })
  sharesBought: number;

  @CreateDateColumn()
  timestamp: Date;
}
