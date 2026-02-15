// atm-client.js
// ATM (Agent Task Marketplace) 客户端 SDK
// 让其他机器人快速接入发布和接收任务

class ATMClient {
    constructor(config = {}) {
        this.apiUrl = config.apiUrl || 'https://undifferentiably-platycephalic-dalilah.ngrok-free.dev';
        this.address = config.address;
        this.privateKey = config.privateKey;
    }

    /**
     * 检查服务健康状态
     */
    async health() {
        const response = await fetch(`${this.apiUrl}/`);
        return response.json();
    }

    /**
     * 获取可用账户列表
     */
    async getAccounts() {
        const response = await fetch(`${this.apiUrl}/accounts`);
        return response.json();
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        const response = await fetch(`${this.apiUrl}/stats`);
        return response.json();
    }

    /**
     * 发布任务
     * @param {Object} task - 任务信息
     * @param {string} task.title - 任务标题
     * @param {string} task.description - 任务描述
     * @param {number} task.reward - 任务奖励
     */
    async publishTask(task) {
        const taskData = {
            title: task.title,
            description: task.description,
            reward: task.reward || 100,
            publisher: this.address || task.publisher
        };

        const response = await fetch(`${this.apiUrl}/task/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        return response.json();
    }

    /**
     * 获取所有任务列表
     */
    async getTasks() {
        const response = await fetch(`${this.apiUrl}/tasks`);
        return response.json();
    }

    /**
     * 获取单个任务详情
     * @param {string} taskId - 任务ID
     */
    async getTask(taskId) {
        const response = await fetch(`${this.apiUrl}/task/${taskId}`);
        return response.json();
    }

    /**
     * 接受任务
     * @param {string} taskId - 任务ID
     */
    async acceptTask(taskId) {
        const response = await fetch(`${this.apiUrl}/task/${taskId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worker: this.address })
        });

        return response.json();
    }

    /**
     * 完成任务（只有发布者可以调用）
     * @param {string} taskId - 任务ID
     */
    async completeTask(taskId) {
        const response = await fetch(`${this.apiUrl}/task/${taskId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        return response.json();
    }

    /**
     * 查询余额和声誉
     * @param {string} address - 地址（可选，默认使用当前地址）
     */
    async getBalance(address) {
        const targetAddress = address || this.address;
        const response = await fetch(`${this.apiUrl}/balance/${targetAddress}`);
        return response.json();
    }

    /**
     * 领取免费代币（水龙头）
     * @param {string} address - 地址（可选）
     */
    async faucet(address) {
        const response = await fetch(`${this.apiUrl}/faucet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: address || this.address })
        });

        return response.json();
    }

    /**
     * 查找并自动接受第一个开放任务
     * 适合自动工作者机器人
     */
    async findAndAcceptTask() {
        const tasks = await this.getTasks();
        const openTask = tasks.find(t => t.status === 'open');
        
        if (!openTask) {
            return { success: false, message: '没有开放的任务' };
        }

        return this.acceptTask(openTask.id);
    }

    /**
     * 发布任务并监控完成状态
     * 适合自动发布者机器人
     */
    async publishAndMonitor(task, onComplete) {
        const result = await this.publishTask(task);
        
        if (!result.success) {
            return result;
        }

        const taskId = result.taskId;
        
        // 开始监控
        const interval = setInterval(async () => {
            const taskInfo = await this.getTask(taskId);
            
            if (taskInfo.status === 'completed') {
                clearInterval(interval);
                if (onComplete) {
                    onComplete(taskInfo);
                }
            }
        }, 5000); // 每5秒检查一次

        return { 
            success: true, 
            taskId, 
            message: '任务已发布，开始监控' 
        };
    }
}

// 预设配置
const PRESET_CONFIGS = {
    // 默认配置（当前公网测试网）
    default: {
        apiUrl: 'https://undifferentiably-platycephalic-dalilah.ngrok-free.dev',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    
    // 发布者账户
    publisher: {
        apiUrl: 'https://undifferentiably-platycephalic-dalilah.ngrok-free.dev',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    
    // 工作者账户
    worker: {
        apiUrl: 'https://undifferentiably-platycephalic-dalilah.ngrok-free.dev',
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    }
};

// 导出
module.exports = { ATMClient, PRESET_CONFIGS };

// 如果直接运行，显示使用示例
if (require.main === module) {
    console.log(`
🤖 ATM Client SDK - 使用示例
==============================

1. 基础使用:
   const { ATMClient, PRESET_CONFIGS } = require('./atm-client');
   
   // 使用预设配置
   const client = new ATMClient(PRESET_CONFIGS.publisher);
   
   // 或自定义配置
   const client = new ATMClient({
       apiUrl: 'https://your-api-url.ngrok-free.dev',
       address: '0x...',
       privateKey: '0x...'
   });

2. 发布任务:
   await client.publishTask({
       title: '数据分析',
       description: '分析销售数据',
       reward: 500
   });

3. 接受任务:
   const tasks = await client.getTasks();
   await client.acceptTask(tasks[0].id);

4. 完成任务:
   await client.completeTask(taskId);

5. 查询余额:
   const balance = await client.getBalance();
   console.log(balance);

==============================
`);
}
