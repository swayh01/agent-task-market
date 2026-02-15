// atm-mock-server.js
// 纯 Node.js 模拟区块链服务器，无需 Hardhat，无需测试币

const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// 模拟区块链状态
const state = {
    tasks: new Map(),
    balances: new Map(),
    reputations: new Map(),
    users: new Map(),
    transactions: []
};

// 预置账户（模拟 20 个账户）
const accounts = [
    { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', key: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', balance: 10000 },
    { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', balance: 10000 },
    { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', key: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', balance: 10000 },
];

// 初始化账户
accounts.forEach(acc => {
    state.balances.set(acc.address, acc.balance);
    state.reputations.set(acc.address, 100);
});

// ========== API 路由 ==========

// 健康检查
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ATM Mock Blockchain',
        version: '1.0.0',
        tasks: state.tasks.size,
        accounts: accounts.length
    });
});

// 获取账户列表
app.get('/accounts', (req, res) => {
    res.json(accounts.map(acc => ({
        address: acc.address,
        balance: state.balances.get(acc.address),
        reputation: state.reputations.get(acc.address)
    })));
});

// 发布任务
app.post('/task/publish', (req, res) => {
    const { title, description, reward, publisher } = req.body;
    
    const taskId = 'task_' + randomUUID().replace(/-/g, '').slice(0, 16);
    
    const task = {
        id: taskId,
        publisher: publisher || accounts[0].address,
        worker: null,
        title,
        description,
        reward: reward || 100,
        status: 'open',
        createdAt: Date.now(),
        completedAt: null
    };
    
    state.tasks.set(taskId, task);
    
    // 记录交易
    state.transactions.push({
        type: 'task_published',
        taskId,
        timestamp: Date.now()
    });
    
    res.json({ success: true, taskId, task });
});

// 获取所有任务
app.get('/tasks', (req, res) => {
    const tasks = Array.from(state.tasks.values());
    res.json(tasks);
});

// 获取单个任务
app.get('/task/:taskId', (req, res) => {
    const task = state.tasks.get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
});

// 接受任务
app.post('/task/:taskId/accept', (req, res) => {
    const { worker } = req.body;
    const task = state.tasks.get(req.params.taskId);
    
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'open') return res.status(400).json({ error: 'Task not open' });
    
    task.worker = worker || accounts[1].address;
    task.status = 'in_progress';
    task.acceptedAt = Date.now();
    
    res.json({ success: true, task });
});

// 完成任务
app.post('/task/:taskId/complete', (req, res) => {
    const task = state.tasks.get(req.params.taskId);
    
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'in_progress') return res.status(400).json({ error: 'Task not in progress' });
    
    task.status = 'completed';
    task.completedAt = Date.now();
    
    // 发放奖励
    const currentBalance = state.balances.get(task.worker) || 0;
    state.balances.set(task.worker, currentBalance + task.reward);
    
    // 增加声誉
    const currentRep = state.reputations.get(task.worker) || 0;
    state.reputations.set(task.worker, currentRep + 10);
    
    res.json({ 
        success: true, 
        task,
        reward: task.reward,
        newBalance: state.balances.get(task.worker)
    });
});

// 水龙头 - 免费获取代币
app.post('/faucet', (req, res) => {
    const { address } = req.body;
    const targetAddress = address || accounts[0].address;
    
    const currentBalance = state.balances.get(targetAddress) || 0;
    state.balances.set(targetAddress, currentBalance + 1000);
    
    res.json({
        success: true,
        address: targetAddress,
        amount: 1000,
        newBalance: state.balances.get(targetAddress)
    });
});

// 查询余额
app.get('/balance/:address', (req, res) => {
    const balance = state.balances.get(req.params.address) || 0;
    const reputation = state.reputations.get(req.params.address) || 0;
    res.json({ address: req.params.address, balance, reputation });
});

// 获取统计
app.get('/stats', (req, res) => {
    const tasks = Array.from(state.tasks.values());
    res.json({
        totalTasks: tasks.length,
        openTasks: tasks.filter(t => t.status === 'open').length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        totalAccounts: accounts.length,
        totalTransactions: state.transactions.length
    });
});

// 启动服务器
const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
    console.log(`
🚀 ATM Mock Blockchain Server Started!
=====================================

📡 Local:   http://localhost:${PORT}
📖 API Docs:
  GET  /                 - 健康检查
  GET  /accounts         - 获取测试账户
  GET  /tasks            - 获取所有任务
  POST /task/publish     - 发布任务
  POST /task/:id/accept  - 接受任务
  POST /task/:id/complete- 完成任务
  POST /faucet           - 免费获取代币
  GET  /balance/:address - 查询余额
  GET  /stats            - 获取统计

💰 预置账户（余额 10000）:
  ${accounts[0].address}
  ${accounts[1].address}
  ${accounts[2].address}

🎯 无需水龙头！直接开始测试！
`);
});

module.exports = app;
