import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';
import { Task } from '../task/task.entity';
import { RegisterAgentDto, UpdateAgentSkillsDto, UpdateAgentPreferencesDto, AgentFilterDto } from './agent.dto';
import { BlockchainService } from '../../blockchain/blockchain.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private blockchainService: BlockchainService,
  ) {}
  
  async register(registerDto: RegisterAgentDto, walletAddress: string): Promise<Agent> {
    const existing = await this.agentRepository.findOne({
      where: { walletAddress }
    });
    
    if (existing) {
      throw new ConflictException('Agent already registered with this wallet');
    }
    
    const agent = this.agentRepository.create({
      ...registerDto,
      walletAddress,
      minReward: registerDto.minReward || 0.01,
      maxReward: registerDto.maxReward || 999999,
      preferredTaskTypes: registerDto.preferredTaskTypes || [],
    });
    
    return this.agentRepository.save(agent);
  }
  
  async updateSkills(
    walletAddress: string,
    updateDto: UpdateAgentSkillsDto
  ): Promise<Agent> {
    const agent = await this.findByWallet(walletAddress);
    
    agent.skills = updateDto.skills;
    if (updateDto.skillDetails) {
      agent.skillDetails = updateDto.skillDetails;
    }
    agent.lastActiveAt = new Date();
    
    return this.agentRepository.save(agent);
  }
  
  async updatePreferences(
    walletAddress: string,
    updateDto: UpdateAgentPreferencesDto
  ): Promise<Agent> {
    const agent = await this.findByWallet(walletAddress);
    
    Object.assign(agent, updateDto);
    agent.lastActiveAt = new Date();
    
    return this.agentRepository.save(agent);
  }
  
  async findByWallet(walletAddress: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { walletAddress }
    });
    
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    
    return agent;
  }
  
  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }
  
  async findAll(filters: AgentFilterDto): Promise<Agent[]> {
    const query = this.agentRepository.createQueryBuilder('agent');
    
    if (filters.skill) {
      query.andWhere(':skill = ANY(agent.skills)', { skill: filters.skill });
    }
    
    if (filters.minReputation !== undefined) {
      query.andWhere('agent.reputationScore >= :minReputation', {
        minReputation: filters.minReputation
      });
    }
    
    if (filters.isAvailable !== undefined) {
      query.andWhere('agent.isAvailable = :isAvailable', {
        isAvailable: filters.isAvailable
      });
    }
    
    return query
      .orderBy('agent.reputationScore', 'DESC')
      .skip(filters.offset || 0)
      .take(filters.limit || 20)
      .getMany();
  }
  
  /**
   * Get recommended tasks for an agent based on their skills
   */
  async getRecommendedTasks(walletAddress: string): Promise<Task[]> {
    const agent = await this.findByWallet(walletAddress);
    
    if (!agent.skills || agent.skills.length === 0) {
      return [];
    }
    
    const query = this.taskRepository.createQueryBuilder('task')
      .where('task.status = :status', { status: 'PUBLISHED' })
      .andWhere('task.reward >= :minReward', { minReward: agent.minReward })
      .andWhere('task.reward <= :maxReward', { maxReward: agent.maxReward });
    
    // Match tasks that require agent's skills
    if (agent.skills.length > 0) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM unnest(task.skills) task_skill
          WHERE task_skill = ANY(:agentSkills)
        )`,
        { agentSkills: agent.skills }
      );
    }
    
    // Prefer agent's preferred task types
    if (agent.preferredTaskTypes && agent.preferredTaskTypes.length > 0) {
      query.addOrderBy(
        `CASE WHEN task.taskType IN (:...preferredTypes) THEN 0 ELSE 1 END`,
        'ASC'
      );
    }
    
    // Check min reputation requirement
    query.andWhere('task.minReputation <= :agentReputation', {
      agentReputation: agent.reputationScore
    });
    
    return query
      .orderBy('task.createdAt', 'DESC')
      .limit(20)
      .getMany();
  }
  
  /**
   * Find agents that match a task's requirements
   * Used for task push notifications
   */
  async findAgentsForTask(task: Task): Promise<Agent[]> {
    const query = this.agentRepository.createQueryBuilder('agent')
      .where('agent.isAvailable = true')
      .andWhere('agent.reputationScore >= :minReputation', {
        minReputation: task.minReputation || 0
      });
    
    // Match task skills with agent skills
    if (task.skills && task.skills.length > 0) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM unnest(agent.skills) agent_skill
          WHERE agent_skill = ANY(:taskSkills)
        )`,
        { taskSkills: task.skills }
      );
    }
    
    // Check reward fits agent's preferences
    const reward = parseFloat(task.reward);
    query.andWhere('agent.minReward <= :reward', { reward });
    query.andWhere('agent.maxReward >= :reward', { reward });
    
    return query
      .orderBy('agent.reputationScore', 'DESC')
      .limit(50)
      .getMany();
  }
  
  /**
   * Sync agent reputation from blockchain
   */
  async syncReputation(walletAddress: string): Promise<Agent> {
    const agent = await this.findByWallet(walletAddress);
    
    const reputation = await this.blockchainService.getReputation(walletAddress);
    
    agent.reputationScore = reputation.score;
    agent.totalTasksCompleted = reputation.totalTasksCompleted;
    agent.totalTasksPublished = reputation.totalTasksPublished;
    agent.totalEarned = reputation.totalEarned.toString();
    agent.totalSpent = reputation.totalSpent.toString();
    
    return this.agentRepository.save(agent);
  }
  
  async delete(walletAddress: string): Promise<void> {
    const agent = await this.findByWallet(walletAddress);
    await this.agentRepository.remove(agent);
  }
}
