import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Startup } from '../../startups/entities/startup.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  startupId: string;

  @ManyToOne(() => Startup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'startupId' })
  startup: Startup;

  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('text')
  text: string;

  @Column('simple-array', { default: '' })
  upvotedBy: string[];

  @CreateDateColumn()
  createdAt: Date;
}
