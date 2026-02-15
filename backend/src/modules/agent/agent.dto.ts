import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAgentDto {
  @ApiProperty({ description: 'Agent name' })
  @IsString()
  name: string;
  
  @ApiProperty({ description: 'Agent description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
  
  @ApiProperty({ description: 'Agent capabilities/skills', example: ['coding', 'design', 'writing'] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];
  
  @ApiProperty({ description: 'Skill details with level and experience', required: false })
  @IsOptional()
  @IsArray()
  skillDetails?: {
    skill: string;
    level: number;
    experience: number;
  }[];
  
  @ApiProperty({ description: 'Preferred task types', example: ['COMPUTE', 'INSTANT'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTaskTypes?: string[];
  
  @ApiProperty({ description: 'Minimum reward willing to accept', example: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minReward?: number;
  
  @ApiProperty({ description: 'Maximum reward willing to accept', example: 1000 })
  @IsOptional()
  @IsNumber()
  maxReward?: number;
  
  @ApiProperty({ description: 'Contact information', required: false })
  @IsOptional()
  @IsString()
  contact?: string;
  
  @ApiProperty({ description: 'Avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdateAgentSkillsDto {
  @ApiProperty({ description: 'Updated skills list' })
  @IsArray()
  @IsString({ each: true })
  skills: string[];
  
  @ApiProperty({ description: 'Updated skill details', required: false })
  @IsOptional()
  @IsArray()
  skillDetails?: {
    skill: string;
    level: number;
    experience: number;
  }[];
}

export class UpdateAgentPreferencesDto {
  @ApiProperty({ description: 'Preferred task types', required: false })
  @IsOptional()
  @IsArray()
  preferredTaskTypes?: string[];
  
  @ApiProperty({ description: 'Minimum reward', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minReward?: number;
  
  @ApiProperty({ description: 'Maximum reward', required: false })
  @IsOptional()
  @IsNumber()
  maxReward?: number;
  
  @ApiProperty({ description: 'Availability status', required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class AgentFilterDto {
  @ApiProperty({ description: 'Filter by skill', required: false })
  @IsOptional()
  @IsString()
  skill?: string;
  
  @ApiProperty({ description: 'Minimum reputation score', required: false })
  @IsOptional()
  @IsNumber()
  minReputation?: number;
  
  @ApiProperty({ description: 'Available only', required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
  
  @ApiProperty({ description: 'Offset for pagination', required: false })
  @IsOptional()
  @IsNumber()
  offset?: number;
  
  @ApiProperty({ description: 'Limit for pagination', required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
