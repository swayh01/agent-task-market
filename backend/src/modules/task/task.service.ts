import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './task.entity';
import { CreateTaskDto, TaskFilterDto } from './task.dto';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { AgentService } from '../agent/agent.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private blockchainService: BlockchainService,
    private agentService: AgentService,
  ) {}
  
  async create(createTaskDto: CreateTaskDto, publisherAddress: string): Promise<Task> {
    // Call smart contract
    const tx = await this.blockchainService.createTask({
      ...createTaskDto,
      publisherAddress,
    });
    
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === 'TaskCreated');
    const chainTaskId = event?.args?.taskId?.toString();
    
    // Save to database
    const task = this.taskRepository.create({
      ...createTaskDto,
      chainTaskId,
      publisherAddress,
      status: TaskStatus.PUBLISHED,
      txHash: receipt.transactionHash,
    });
    
    const savedTask = await this.taskRepository.save(task);
    
    // Push task to matching agents
    await this.pushTaskToAgents(savedTask);
    
    return savedTask;
  }
  
  /**
   * Push task to agents that match the requirements
   */
  private async pushTaskToAgents(task: Task): Promise<void> {
    try {
      const matchingAgents = await this.agentService.findAgentsForTask(task);
      
      if (matchingAgents.length > 0) {
        this.logger.log(`Pushing task ${task.id} to ${matchingAgents.length} matching agents`);
        
        // TODO: Implement push notification (WebSocket, email, etc.)
        // For now, just log the matching agents
        matchingAgents.forEach(agent => {
          this.logger.log(`Task ${task.id} matches agent ${agent.name} (${agent.walletAddress})`);
        });
      }
    } catch (error) {
      this.logger.error('Failed to push task to agents', error);
    }
  }
  
  async findAll(filters: TaskFilterDto): Promise<Task[]> {
    const query = this.taskRepository.createQueryBuilder('task');
    
    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }
    
    if (filters.skill) {
      query.andWhere(':skill = ANY(task.skills)', { skill: filters.skill });
    }
    
    if (filters.minReward) {
      query.andWhere('task.reward >= :minReward', { minReward: filters.minReward });
    }
    
    if (filters.maxReward) {
      query.andWhere('task.reward <= :maxReward', { maxReward: filters.maxReward });
    }
    
    if (filters.publisherAddress) {
      query.andWhere('task.publisherAddress = :publisherAddress', {
        publisherAddress: filters.publisherAddress,
      });
    }
    
    if (filters.taskType) {
      query.andWhere('task.taskType = :taskType', { taskType: filters.taskType });
    }
    
    // Pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    
    return query
      .orderBy('task.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
  }
  
  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }
  
  async findByChainId(chainTaskId: number): Promise<Task> {
    return this.taskRepository.findOne({ where: { chainTaskId } });
  }
  
  async acceptTask(id: string, executorAddress: string): Promise<Task> {
    const task = await this.findOne(id);
    
    const tx = await this.blockchainService.acceptTask(task.chainTaskId, executorAddress);
    await tx.wait();
    
    task.executorAddress = executorAddress;
    task.status = TaskStatus.IN_PROGRESS;
    task.assignedAt = new Date();
    
    return this.taskRepository.save(task);
  }
  
  async submitWork(id: string, resultCID: string, executorAddress: string): Promise<Task> {
    const task = await this.findOne(id);
    
    if (task.executorAddress !== executorAddress) {
      throw new Error('Not authorized');
    }
    
    const tx = await this.blockchainService.submitWork(task.chainTaskId, resultCID);
    await tx.wait();
    
    task.resultCID = resultCID;
    task.status = TaskStatus.SUBMITTED;
    task.submittedAt = new Date();
    
    return this.taskRepository.save(task);
  }
  
  async verifyTask(id: string, approved: boolean, publisherAddress: string): Promise<Task> {
    const task = await this.findOne(id);
    
    if (task.publisherAddress !== publisherAddress) {
      throw new Error('Not authorized');
    }
    
    const tx = await this.blockchainService.verifyTask(task.chainTaskId, approved);
    await tx.wait();
    
    task.status = approved ? TaskStatus.COMPLETED : TaskStatus.DISPUTED;
    if (approved) {
      task.completedAt = new Date();
    }
    
    return this.taskRepository.save(task);
  }
  
  async syncWithBlockchain(chainTaskId: number): Promise<Task> {
    const chainTask = await this.blockchainService.getTask(chainTaskId);
    
    let task = await this.findByChainId(chainTaskId);
    if (!task) {
      task = this.taskRepository.create({
        chainTaskId,
      });
    }
    
    task.title = chainTask.title;
    task.publisherAddress = chainTask.publisher;
    task.executorAddress = chainTask.executor;
    task.reward = chainTask.reward.toString();
    task.status = Object.values(TaskStatus)[chainTask.status];
    
    return this.taskRepository.save(task);
  }
  
  /**
   * Browse tasks - available for all agents to find work
   */
  async browseTasks(filters: TaskFilterDto, agentAddress?: string): Promise<Task[]> {
    // Get agent preferences if available
    let agentSkills: string[] = [];
    let agentMinReward: number = 0;
    let agentMaxReward: number = 999999;
    
    if (agentAddress) {
      try {
        const agent = await this.agentService.findByWallet(agentAddress);
        agentSkills = agent.skills || [];
        agentMinReward = agent.minReward || 0;
        agentMaxReward = agent.maxReward || 999999;
      } catch (e) {
        // Agent not found, use default filters
      }
    }
    
    const query = this.taskRepository.createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.PUBLISHED });
    
    // Apply filters
    if (filters.skill) {
      query.andWhere(':skill = ANY(task.skills)', { skill: filters.skill });
    }
    
    if (filters.minReward) {
      query.andWhere('task.reward >= :minReward', { minReward: filters.minReward });
    } else {
      query.andWhere('task.reward >= :agentMinReward', { agentMinReward });
    }
    
    if (filters.maxReward) {
      query.andWhere('task.reward <= :maxReward', { maxReward: filters.maxReward });
    } else {
      query.andWhere('task.reward <= :agentMaxReward', { agentMaxReward });
    }
    
    if (filters.taskType) {
      query.andWhere('task.taskType = :taskType', { taskType: filters.taskType });
    }
    
    // If agent has skills, prioritize matching tasks
    if (agentSkills.length > 0) {
      query.addOrderBy(
        `CASE WHEN EXISTS (
          SELECT 1 FROM unnest(task.skills) task_skill
          WHERE task_skill = ANY(:agentSkills)
        ) THEN 0 ELSE 1 END`,
        'ASC'
      );
    }
    
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    
    return query
      .setParameter('agentSkills', agentSkills)
      .orderBy('task.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
  }
}
