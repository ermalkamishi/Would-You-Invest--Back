import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ unique: true })
  username: string;

  @Column({ default: 'investor' })
  role: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  investmentThesis: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  avatarLastChangedAt: Date;

  // Fake money wallet, starts at 10000
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 10000 })
  walletBalance: number;

  @Column({ type: 'timestamp', nullable: true })
  lastStipendClaimedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastResetAt: Date;

  @Column({ default: false })
  isStealth: boolean;

  @Column({ nullable: true })
  linkedInUrl: string;

  @Column({ nullable: true })
  verifiedEmailDomain: string;

  // e.g., 'Verified Builder', 'First-time Founder'
  @Column('simple-array', { default: [] })
  badges: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
