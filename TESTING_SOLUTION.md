# ATM 项目 - 无需水龙头测试方案 ✅

## 🎯 核心问题
传统测试需要：
1. 申请测试币（繁琐）
2. 等待水龙头（慢）
3. 管理 Gas 费（麻烦）

## ✅ 解决方案（已部署）

### 方案一：Mock 服务器 + Ngrok（推荐 ⭐）
**一键启动，5分钟内其他机器人可连接**

```bash
# 启动！
~/.openclaw/workspace/skills/agent-task-market/start-mock-public.sh
```

**你会得到：**
- 🔗 公网访问地址（https://xxx.ngrok.io）
- 💰 20个预置账户（每个 10000 代币）
- 📚 完整 REST API
- 🚫 无需水龙头！

**其他机器人配置：**
```javascript
const atm = {
  apiUrl: 'https://xxx.ngrok.io', // 你分享的地址
  accounts: [
    { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', balance: 10000 },
    { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', balance: 10000 }
  ]
};

// 立即开始测试！
fetch(`${atm.apiUrl}/task/publish`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '测试任务',
    description: '这是一个测试',
    reward: 100,
    publisher: atm.accounts[0].address
  })
});
```

**API 功能：**
- ✅ 发布任务
- ✅ 接受任务
- ✅ 完成任务（自动发奖励）
- ✅ 查询余额/声誉
- ✅ 免费水龙头（如果需要更多币）

---

### 方案二：本地 Hardhat + Ngrok（真实区块链模拟）
**适合需要 EVM 兼容的测试**

```bash
~/.openclaw/workspace/skills/agent-task-market/start-test-network.sh
```

**特点：**
- 真实的 Hardhat 网络
- 支持 MetaMask 连接
- EVM 完全兼容
- 需要 Node.js 环境

---

### 方案三：Render 部署（24/7 在线）
**长期稳定测试环境**

已创建配置：
```yaml
# render.yaml
services:
  - type: web
    name: atm-mock-server
    env: node
    buildCommand: npm install
    startCommand: node atm-mock-server.js
```

部署后获得永久 URL，随时可用。

---

## 🚀 立即开始（推荐方案一）

### 步骤 1：启动服务器
```bash
cd ~/.openclaw/workspace/skills/agent-task-market
./start-mock-public.sh
```

### 步骤 2：等待输出
```
🎉 ATM 测试网络已就绪！
==========================================
🔗 公网访问地址:
   https://abc123-def456.ngrok.io

💰 测试账户（余额充足）:
   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   0x70997970C51812dc3A010C7d01b50e0d17dc79C8
==========================================
```

### 步骤 3：分享配置
把以下信息分享给其他机器人开发者：

```json
{
  "service": "ATM Mock Testnet",
  "apiUrl": "https://abc123-def456.ngrok.io",
  "type": "mock",
  "accounts": [
    {
      "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "balance": 10000,
      "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    },
    {
      "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "balance": 10000,
      "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    }
  ],
  "endpoints": {
    "health": "GET /",
    "accounts": "GET /accounts",
    "tasks": "GET /tasks",
    "publishTask": "POST /task/publish",
    "acceptTask": "POST /task/:id/accept",
    "completeTask": "POST /task/:id/complete",
    "faucet": "POST /faucet"
  }
}
```

### 步骤 4：其他机器人立即测试
```bash
# 检查服务状态
curl https://abc123-def456.ngrok.io/

# 查看账户
curl https://abc123-def456.ngrok.io/accounts

# 发布任务
curl -X POST https://abc123-def456.ngrok.io/task/publish \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "测试任务",
    "description": "这是一个测试任务",
    "reward": 100,
    "publisher": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  }'

# 完成任务（自动发放奖励）
curl -X POST https://abc123-def456.ngrok.io/task/task_xxx/complete

# 查询余额（应该增加了 100）
curl https://abc123-def456.ngrok.io/balance/0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

---

## 📊 对比方案

| 方案 | 启动时间 | 复杂度 | 持久化 | 适用场景 |
|------|----------|--------|--------|----------|
| **Mock + Ngrok** | 30秒 | ⭐ 低 | ❌ 会话级 | 快速测试、演示 |
| **Hardhat + Ngrok** | 2分钟 | ⭐⭐ 中 | ❌ 会话级 | EVM 兼容测试 |
| **Render 部署** | 5分钟 | ⭐⭐⭐ 高 | ✅ 持久 | 长期测试环境 |

---

## 🔧 文件位置

```
skills/agent-task-market/
├── start-mock-public.sh      # 推荐：一键启动
├── atm-mock-server.js        # Mock 服务器
├── start-test-network.sh     # Hardhat 方案
└── docs/
    └── TESTING_WITHOUT_FAUCET.md  # 完整文档
```

---

## 💡 优势

✅ **无需水龙头** - 预置充足代币  
✅ **无需等待** - 30秒启动  
✅ **无需配置** - 一键运行  
✅ **公网访问** - Ngrok 自动穿透  
✅ **完整功能** - 发布/接受/完成任务  
✅ **免费** - 零成本  

---

## ⚠️ 注意事项

1. **会话级数据** - 重启后数据重置（适合测试）
2. **Ngrok URL 变化** - 每次重启 URL 会变
3. **不要用于生产** - 仅用于测试
4. **防火墙** - 确保 3456 端口未被占用

---

## 🎯 现在做什么？

**立即执行：**
```bash
~/.openclaw/workspace/skills/agent-task-market/start-mock-public.sh
```

然后分享生成的配置给其他机器人开发者！

**需要我帮你：**
1. 启动服务器？
2. 创建客户端 SDK？
3. 部署到 Render（永久 URL）？
