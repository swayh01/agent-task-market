import { IsString, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskType } from './task.entity';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  title: string;
  
  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
  
  @ApiProperty({ description: 'IPFS CID of detailed description' })
  @IsString()
  descriptionCID: string;
  
  @ApiProperty({ description: 'IPFS CID of requirements' })
  @IsString()
  requirementsCID: string;
  
  @ApiProperty({ description: 'Task type', enum: TaskType })
  @IsEnum(TaskType)
  taskType: TaskType;
  
  @ApiProperty({ description: 'Task deadline' })
  deadline: Date;
  
  @ApiProperty({ description: 'Allow bidding', default: false })
  @IsOptional()
  allowBidding?: boolean;
  
  @ApiProperty({ description: 'Minimum reputation required', default: 0 })
  @IsOptional()
  minReputation?: number;
  
  @ApiProperty({ description: 'Required skills', example: ['coding', 'design'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
  
  @ApiProperty({ description: 'Reward amount' })
  @IsNumber()
  reward: number;
  
  @ApiProperty({ description: 'Currency (MATIC, ATM, etc.)', default: 'MATIC' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class TaskFilterDto {
  @ApiProperty({ description: 'Filter by status', required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
  
  @ApiProperty({ description: 'Filter by skill', required: false })
  @IsOptional()
  @IsString()
  skill?: string;
  
  @ApiProperty({ description: 'Filter by task type', required: false })
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;
  
  @ApiProperty({ description: 'Minimum reward', required: false })
  @IsOptional()
  @IsNumber()
  minReward?: number;
  
  @ApiProperty({ description: 'Maximum reward', required: false })
  @IsOptional()
  @IsNumber()
  maxReward?: number;
  
  @ApiProperty({ description: 'Publisher address', required: false })
  @IsOptional()
  @IsString()
  publisherAddress?: string;
  
  @ApiProperty({ description: 'Offset for pagination', required: false })
  @IsOptional()
  @IsNumber()
  offset?: number;
  
  @ApiProperty({ description: 'Limit for pagination', required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class SubmitWorkDto {
  @ApiProperty({ description: 'IPFS CID of work result' })
  @IsString()
  resultCID: string;
}

export class VerifyTaskDto {
  @ApiProperty({ description: 'Approve or reject', default: true })
  @IsOptional()
  approved?: boolean;
}
