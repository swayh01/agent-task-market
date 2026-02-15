import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { RegisterAgentDto, UpdateAgentSkillsDto, UpdateAgentPreferencesDto, AgentFilterDto } from './agent.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('Agents')
@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}
  
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new agent with skills' })
  @ApiResponse({ status: 201, description: 'Agent registered successfully' })
  @ApiResponse({ status: 409, description: 'Agent already exists' })
  async register(@Body() registerDto: RegisterAgentDto, @Req() req) {
    const agent = await this.agentService.register(registerDto, req.user.walletAddress);
    return {
      success: true,
      data: agent,
      message: 'Agent registered successfully'
    };
  }
  
  @Get()
  @ApiOperation({ summary: 'List all agents with filters' })
  async findAll(@Query() filters: AgentFilterDto) {
    const agents = await this.agentService.findAll(filters);
    return {
      success: true,
      data: agents,
      count: agents.length
    };
  }
  
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current agent profile' })
  async getMe(@Req() req) {
    const agent = await this.agentService.findByWallet(req.user.walletAddress);
    return {
      success: true,
      data: agent
    };
  }
  
  @Get('recommended-tasks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tasks matching agent skills (Task Push)' })
  @ApiResponse({ status: 200, description: 'Returns tasks matching agent capabilities' })
  async getRecommendedTasks(@Req() req) {
    const tasks = await this.agentService.getRecommendedTasks(req.user.walletAddress);
    return {
      success: true,
      data: tasks,
      count: tasks.length
    };
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  async findOne(@Param('id') id: string) {
    const agent = await this.agentService.findOne(id);
    return {
      success: true,
      data: agent
    };
  }
  
  @Put('skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agent skills (Add/Remove capabilities)' })
  @ApiResponse({ status: 200, description: 'Skills updated successfully' })
  async updateSkills(@Body() updateDto: UpdateAgentSkillsDto, @Req() req) {
    const agent = await this.agentService.updateSkills(req.user.walletAddress, updateDto);
    return {
      success: true,
      data: agent,
      message: 'Skills updated successfully'
    };
  }
  
  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agent preferences (task types, reward range, availability)' })
  async updatePreferences(@Body() updateDto: UpdateAgentPreferencesDto, @Req() req) {
    const agent = await this.agentService.updatePreferences(req.user.walletAddress, updateDto);
    return {
      success: true,
      data: agent,
      message: 'Preferences updated successfully'
    };
  }
  
  @Post('sync-reputation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync agent reputation from blockchain' })
  async syncReputation(@Req() req) {
    const agent = await this.agentService.syncReputation(req.user.walletAddress);
    return {
      success: true,
      data: agent,
      message: 'Reputation synced successfully'
    };
  }
  
  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete agent profile' })
  async delete(@Req() req) {
    await this.agentService.delete(req.user.walletAddress);
    return {
      success: true,
      message: 'Agent deleted successfully'
    };
  }
}
