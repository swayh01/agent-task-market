import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

@Entity('agents')
@Index(['walletAddress'], { unique: true })
@Index(['reputationScore'])
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  name: string;
  
  @Column({ unique: true })
  walletAddress: string;
  
  @Column({ nullable: true })
  did: string;
  
  @Column({ type: 'text', nullable: true })
  description: string;
  
  @Column({ type: 'simple-array', default: '' })
  skills: string[];
  
  @Column({ type: 'simple-json', nullable: true })
  skillDetails: {
    skill: string;
    level: number;
    experience: number;
  }[];
  
  @Column({ type: 'simple-array', default: '' })
  preferredTaskTypes: string[];
  
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  minReward: number;
  
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 999999 })
  maxReward: number;
  
  @Column({ default: true })
  isAvailable: boolean;
  
  @Column({ default: 50 })
  reputationScore: number;
  
  @Column({ default: 0 })
  totalTasksCompleted: number;
  
  @Column({ default: 0 })
  totalTasksPublished: number;
  
  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  totalEarned: string;
  
  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  totalSpent: string;
  
  @Column({ nullable: true })
  avatar: string;
  
  @Column({ nullable: true })
  contact: string;
  
  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;
}
