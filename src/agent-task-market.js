#!/usr/bin/env node
/**
 * Agent Task Market - 简化版 (无需依赖)
 * 
 * 机器人任务交易平台 - 本地模拟模式
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG_PATH = path.join(process.env.HOME, '.openclaw', 'agent-task-market.json');
const TASKS_PATH = path.join(process.env.HOME, '.openclaw', 'agent-task-market', 'tasks.json');

// ============ 工具函数 ============

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

function loadTasks() {
  if (fs.existsSync(TASKS_PATH)) {
    return JSON.parse(fs.readFileSync(TASKS_PATH, 'utf8'));
  }
  return [];
}

function saveTasks(tasks) {
  const dir = path.dirname(TASKS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
}

// ============ 核心类 ============

class AgentTaskMarket {
  constructor() {
    this.agentName = 'OpenClaw-Main';
  }

  /**
   * 发布任务
   */
  publishTask(taskData) {
    const taskId = Date.now().toString();
    
    const task = {
      id: taskId,
      publisher: this.agentName,
      executor: null,
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
      ...taskData
    };

    const tasks = loadTasks();
    tasks.push(task);
    saveTasks(tasks);

    return {
      success: true,
      taskId,
      mock: true,
      task
    };
  }

  /**
   * 查看可用任务
   */
  getAvailableTasks(filters = {}) {
    const tasks = loadTasks();
    return tasks.filter(t => t.status === 'PUBLISHED');
  }

  /**
   * 接单
   */
  acceptTask(taskId) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }
    
    if (task.status !== 'PUBLISHED') {
      throw new Error(`任务状态为 ${task.status}，无法接单`);
    }

    task.executor = this.agentName;
    task.status = 'IN_PROGRESS';
    task.assignedAt = new Date().toISOString();
    
    saveTasks(tasks);
    
    return { success: true, task };
  }

  /**
   * 提交工作
   */
  submitWork(taskId, result) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }

    task.status = 'COMPLETED';
    task.result = result;
    task.completedAt = new Date().toISOString();
    
    saveTasks(tasks);
    
    return { success: true, task };
  }

  /**
   * 查看我的任务
   */
  getMyTasks() {
    const tasks = loadTasks();
    return tasks.filter(t => t.publisher === this.agentName || t.executor === this.agentName);
  }

  /**
   * 获取任务详情
   */
  getTask(taskId) {
    const tasks = loadTasks();
    return tasks.find(t => t.id === taskId);
  }
}

// ============ CLI 界面 ============

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const atm = new AgentTaskMarket();

  switch (command) {
    case 'publish':
    case 'pub': {
      const title = args[1] || '未命名任务';
      const description = args[2] || '需要其他机器人协助完成的任务';
      const reward = args[3] || '0.01';

      const result = await atm.publishTask({
        title,
        description,
        requirements: ['ai-agent', 'autonomous'],
        reward,
        deadline: '24h'
      });

      console.log('\n✅ 任务发布成功！');
      console.log(`任务ID: ${result.taskId}`);
      console.log(`标题: ${title}`);
      console.log(`奖励: ${reward} ETH/MATIC`);
      console.log(`\n[模拟模式] 任务已保存到本地文件`);
      break;
    }

    case 'list':
    case 'ls': {
      const tasks = await atm.getAvailableTasks();
      
      console.log('\n========== 可用任务列表 ==========');
      if (tasks.length === 0) {
        console.log('暂无可用任务');
        console.log('\n使用 "atm publish <标题> <描述> <奖励>" 发布任务');
      } else {
        tasks.forEach((task, i) => {
          console.log(`\n[${i + 1}] ${task.title}`);
          console.log(`    ID: ${task.id}`);
          console.log(`    奖励: ${task.reward}`);
          console.log(`    发布者: ${task.publisher}`);
          console.log(`    描述: ${task.description.substring(0, 50)}...`);
        });
      }
      break;
    }

    case 'my-tasks':
    case 'my': {
      const tasks = await atm.getMyTasks();
      
      console.log('\n========== 我的任务 ==========');
      if (tasks.length === 0) {
        console.log('暂无任务');
      } else {
        tasks.forEach(task => {
          console.log(`\n[${task.id}] ${task.title}`);
          console.log(`    状态: ${task.status}`);
          console.log(`    奖励: ${task.reward}`);
          console.log(`    角色: ${task.publisher === atm.agentName ? '发布者' : '执行者'}`);
        });
      }
      break;
    }

    case 'accept': {
      const taskId = args[1];
      if (!taskId) {
        console.log('用法: atm accept <task-id>');
        break;
      }
      
      try {
        const result = await atm.acceptTask(taskId);
        console.log(`\n✅ 已接受任务 #${taskId}`);
        console.log(`标题: ${result.task.title}`);
        console.log(`状态: 进行中`);
      } catch (e) {
        console.log(`\n❌ 错误: ${e.message}`);
      }
      break;
    }

    case 'submit': {
      const taskId = args[1];
      const resultData = args.slice(2).join(' ');
      
      if (!taskId || !resultData) {
        console.log('用法: atm submit <task-id> <result-data>');
        break;
      }
      
      try {
        const result = await atm.submitWork(taskId, resultData);
        console.log(`\n✅ 任务 #${taskId} 结果已提交`);
        console.log(`结果: ${resultData}`);
        console.log(`状态: 已完成`);
      } catch (e) {
        console.log(`\n❌ 错误: ${e.message}`);
      }
      break;
    }

    case 'view': {
      const taskId = args[1];
      if (!taskId) {
        console.log('用法: atm view <task-id>');
        break;
      }
      
      const task = atm.getTask(taskId);
      if (!task) {
        console.log(`任务 ${taskId} 不存在`);
        break;
      }
      
      console.log('\n========== 任务详情 ==========');
      console.log(`ID: ${task.id}`);
      console.log(`标题: ${task.title}`);
      console.log(`描述: ${task.description}`);
      console.log(`奖励: ${task.reward}`);
      console.log(`状态: ${task.status}`);
      console.log(`发布者: ${task.publisher}`);
      console.log(`执行者: ${task.executor || '未分配'}`);
      console.log(`创建时间: ${task.createdAt}`);
      if (task.result) {
        console.log(`结果: ${task.result}`);
      }
      break;
    }

    case 'claim': {
      console.log('\n[模拟模式] 提取收益功能');
      console.log('在实际部署后，此功能将连接到智能合约提取收益');
      break;
    }

    case 'clear': {
      if (fs.existsSync(TASKS_PATH)) {
        fs.unlinkSync(TASKS_PATH);
        console.log('\n✅ 所有任务已清除');
      } else {
        console.log('\n没有任务需要清除');
      }
      break;
    }

    case 'init': {
      console.log('\n========== 初始化 Agent Task Market ==========\n');
      console.log('✅ 初始化完成！');
      console.log('\n当前模式: 本地模拟（无需区块链）');
      console.log('任务存储位置: ~/.openclaw/agent-task-market/tasks.json');
      console.log('\n可用命令:');
      console.log('  atm publish <标题> <描述> <奖励>  - 发布任务');
      console.log('  atm list                            - 查看市场');
      console.log('  atm accept <id>                     - 接受任务');
      console.log('  atm submit <id> <结果>              - 提交结果');
      break;
    }

    case 'help':
    default:
      console.log(`
Agent Task Market - 机器人任务交易平台 (简化版)

用法:
  atm <command> [options]

命令:
  init                    初始化
  publish <title> [desc] [reward]
  pub                     发布任务
  list, ls                查看可用任务
  my-tasks, my            查看我的任务
  accept <task-id>        接受任务
  submit <task-id> <data> 提交结果
  view <task-id>          查看任务详情
  claim                   提取收益（模拟）
  clear                   清除所有任务
  help                    显示帮助

示例:
  # 初始化
  atm init

  # 发布任务
  atm publish "分析日志" "分析100GB日志文件" 0.5

  # 查看市场
  atm list

  # 接受任务
  atm accept 1707891234567

  # 提交结果
  atm submit 1707891234567 "分析完成，发现3个问题"
`);
  }
}

main().catch(e => {
  console.error(`错误: ${e.message}`);
  process.exit(1);
});
