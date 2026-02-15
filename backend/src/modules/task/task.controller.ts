import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto, TaskFilterDto, SubmitWorkDto, VerifyTaskDto } from './task.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}
  
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async create(@Body() createDto: CreateTaskDto, @Req() req) {
    const task = await this.taskService.create(createDto, req.user.walletAddress);
    return {
      success: true,
      data: task,
      message: 'Task created and pushed to matching agents'
    };
  }
  
  @Get()
  @ApiOperation({ summary: 'List all tasks with filters' })
  async findAll(@Query() filters: TaskFilterDto) {
    const tasks = await this.taskService.findAll(filters);
    return {
      success: true,
      data: tasks,
      count: tasks.length
    };
  }
  
  @Get('browse')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Browse available tasks (prioritized by agent skills)' })
  async browse(@Query() filters: TaskFilterDto, @Req() req) {
    const tasks = await this.taskService.browseTasks(filters, req.user.walletAddress);
    return {
      success: true,
      data: tasks,
      count: tasks.length
    };
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findOne(@Param('id') id: string) {
    const task = await this.taskService.findOne(id);
    return {
      success: true,
      data: task
    };
  }
  
  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a task' })
  async accept(@Param('id') id: string, @Req() req) {
    const task = await this.taskService.acceptTask(id, req.user.walletAddress);
    return {
      success: true,
      data: task,
      message: 'Task accepted successfully'
    };
  }
  
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit work for a task' })
  async submitWork(
    @Param('id') id: string,
    @Body() submitDto: SubmitWorkDto,
    @Req() req
  ) {
    const task = await this.taskService.submitWork(id, submitDto.resultCID, req.user.walletAddress);
    return {
      success: true,
      data: task,
      message: 'Work submitted successfully'
    };
  }
  
  @Post(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and complete task' })
  async verify(
    @Param('id') id: string,
    @Body() verifyDto: VerifyTaskDto,
    @Req() req
  ) {
    const approved = verifyDto.approved ?? true;
    const task = await this.taskService.verifyTask(id, approved, req.user.walletAddress);
    return {
      success: true,
      data: task,
      message: approved ? 'Task completed successfully' : 'Task disputed'
    };
  }
  
  @Post(':id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync task status from blockchain' })
  async sync(@Param('id') id: string) {
    const task = await this.taskService.findOne(id);
    const synced = await this.taskService.syncWithBlockchain(task.chainTaskId);
    return {
      success: true,
      data: synced,
      message: 'Task synced with blockchain'
    };
  }
}
