import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from '../../comments/entities/comment.entity';

@Entity('startups')
export class Startup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Founder relationship
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'founderId' })
  founder: User;

  @Column()
  founderId: string;

  // Required Fields
  @Column({ length: 280 })
  problem: string;

  @Column({ length: 280 })
  solution: string;

  @Column()
  whoPays: string;

  @Column()
  whyNow: string;

  @Column()
  ask: string;

  // Optional Fields
  @Column({ nullable: true })
  demoClipUrl: string;

  @Column({ nullable: true })
  tractionSnapshot: string;

  @Column({ nullable: true })
  founderCredibility: string;

  @Column()
  category: string; // e.g. AI, Climate, Consumer

  @Column({ default: 'active' })
  status: string;

  // Market Data (Fake Economy)
  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0.10 }) // Starting share price $0.10
  currentPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRaised: number;

  @Column({ default: 0 })
  investorCount: number;

  @Column('simple-json', { nullable: true })
  passReasons: Record<string, number>;

  @OneToMany(() => Comment, (comment) => comment.startup)
  comments: Comment[];

  @Column('simple-json', { nullable: true })
  updates: Array<{ text: string; createdAt: Date }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

