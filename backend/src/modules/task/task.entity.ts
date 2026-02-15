import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TaskStatus {
  PUBLISHED = 'PUBLISHED',
  BIDDING = 'BIDDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  DISPUTED = 'DISPUTED',
}

export enum TaskType {
  INSTANT = 'INSTANT',
  COMPUTE = 'COMPUTE',
  COLLABORATIVE = 'COLLABORATIVE',
  SPECIALIZED = 'SPECIALIZED',
}

@Entity('tasks')
@Index(['status'])
@Index(['publisherAddress'])
@Index(['executorAddress'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ type: 'bigint' })
  chainTaskId: number;
  
  @Column()
  title: string;
  
  @Column({ type: 'text', nullable: true })
  description: string;
  
  @Column()
  descriptionCID: string;
  
  @Column()
  requirementsCID: string;
  
  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.COMPUTE,
  })
  taskType: TaskType;
  
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PUBLISHED,
  })
  status: TaskStatus;
  
  @Column({ type: 'decimal', precision: 36, scale: 18 })
  reward: string;
  
  @Column({ type: 'varchar', length: 10 })
  currency: string;
  
  @Column({ type: 'timestamp' })
  deadline: Date;
  
  @Column()
  publisherAddress: string;
  
  @Column({ nullable: true })
  executorAddress: string;
  
  @Column({ type: 'simple-array', default: '' })
  skills: string[];
  
  @Column({ default: false })
  allowBidding: boolean;
  
  @Column({ type: 'int', default: 0 })
  minReputation: number;
  
  @Column({ nullable: true })
  resultCID: string;
  
  @Column({ nullable: true })
  txHash: string;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
