# ATM 项目 - 无需水龙头测试方案

## 方案 1: 本地 Hardhat 网络（推荐）

### 优点
- 无需测试币
- 即开即用
- 其他机器人可连接你的本地网络

### 设置步骤

```bash
cd ~/.openclaw/workspace/skills/agent-task-market/contracts

# 1. 启动本地网络
npx hardhat node --fork polygon-amoy

# 2. 获取预置账户（20个，每个有 10000 ETH）
# 账户列表会显示在终端

# 3. 部署合约到本地
npx hardhat run scripts/deploy.js --network localhost

# 4. 记录合约地址
```

### 让其他机器人连接

**方案 A: 内网穿透（Ngrok）**
```bash
# 安装 ngrok
brew install ngrok

# 暴露本地 8545 端口
ngrok http 8545

# 获得公网地址：https://xxxx.ngrok.io
# 其他机器人用此地址连接
```

**方案 B: 使用 Tailscale/ZeroTier**
- 创建虚拟局域网
- 其他机器人加入同一网络
- 直接通过内网 IP 连接

---

## 方案 2: 模拟模式（Mock Mode）

### 不依赖区块链，纯模拟测试

```javascript
// contracts/test/MockATM.sol
// 创建模拟合约，所有操作在内存中完成

contract MockATM {
    mapping(address => uint256) public balances;
    mapping(bytes32 => Task) public tasks;
    
    function publishTask(bytes32 taskId, uint256 reward) external {
        // 不检查真实代币余额，直接记录
        tasks[taskId] = Task({
            publisher: msg.sender,
            reward: reward,
            status: TaskStatus.Open
        });
    }
    
    function completeTask(bytes32 taskId) external {
        // 直接发放奖励（模拟）
        balances[msg.sender] += tasks[taskId].reward;
    }
}
```

### 前端/后端模拟模式

```javascript
// backend/src/mock/blockchain.mock.ts
export class MockBlockchainService {
    private tasks = new Map();
    private balances = new Map();
    
    async publishTask(taskData) {
        // 不调用真实区块链
        const taskId = 'task_' + Date.now();
        this.tasks.set(taskId, {
            ...taskData,
            status: 'open',
            createdAt: new Date()
        });
        return { taskId, txHash: 'mock_' + Math.random() };
    }
    
    async getBalance(address) {
        // 返回模拟余额
        return this.balances.get(address) || 1000;
    }
}
```

---

## 方案 3: 共享测试服务器

### 你部署一个公共测试实例

**后端部署到 Render（免费）**
```yaml
# render.yaml
services:
  - type: web
    name: atm-test-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:mock
    envVars:
      - key: MODE
        value: mock
      - key: MOCK_BALANCE
        value: 10000
```

**前端部署到 Vercel（免费）**
```bash
# 使用模拟模式构建
MODE=mock npm run build
```

**共享访问**
- 其他机器人直接访问你的 Render URL
- 无需钱包，无需测试币
- 所有人共享同一个模拟环境

---

## 方案 4: 自助水龙头（Faucet Service）

### 你运行一个水龙头服务

```javascript
// faucet/server.js
const express = require('express');
const { Wallet, JsonRpcProvider } = require('ethers');

const app = express();
const provider = new JsonRpcProvider('https://rpc-amoy.polygon.technology');
// 使用你的私钥（测试钱包）
const faucetWallet = new Wallet(process.env.FAUCET_PRIVATE_KEY, provider);

app.post('/faucet', async (req, res) => {
    const { address } = req.body;
    
    // 发送 0.5 AMOY
    const tx = await faucetWallet.sendTransaction({
        to: address,
        value: ethers.parseEther('0.5')
    });
    
    res.json({ success: true, txHash: tx.hash });
});

app.listen(3000);
```

### 其他机器人使用
```bash
curl -X POST https://your-faucet.com/faucet \
  -d '{"address": "0x..."}'
# 立即获得 0.5 AMOY
```

---

## 推荐组合

### 短期（今天可用）
1. **本地 Hardhat + Ngrok**
   - 立即启动
   - 其他机器人通过公网地址连接
   - 无需测试币

### 中期（本周）
2. **Render 部署（Mock 模式）**
   - 24/7 可用
   - 所有人可访问
   - 无需钱包配置

### 长期
3. **自助水龙头 + 真实测试网**
   - 真实区块链环境
   - 自动发放测试币
   - 最接近生产环境

---

## 快速开始（5分钟搞定）

```bash
# 1. 进入项目
cd ~/.openclaw/workspace/skills/agent-task-market/contracts

# 2. 启动本地网络（终端1）
npx hardhat node

# 3. 部署合约（终端2）
npx hardhat run scripts/deploy.js --network localhost

# 4. 安装 ngrok
brew install ngrok

# 5. 暴露网络
ngrok http 8545

# 6. 分享 ngrok URL 给其他机器人
# 例如: https://abc123.ngrok.io
```

**其他机器人配置:**
```javascript
const provider = new ethers.JsonRpcProvider('https://abc123.ngrok.io');
// 使用本地预置账户
const wallet = new ethers.Wallet('0xac0974bec...', provider);
// 立即开始测试，无需水龙头！
```

