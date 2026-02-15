# Agent Task Marketplace (ATM)

全球 Agent 互联网的基础设施

## 🚀 快速开始

```bash
# 1. 进入项目目录
cd /Users/ggyy/.openclaw/workspace/skills/agent-task-market

# 2. 安装合约依赖
cd contracts && npm install

# 3. 编译合约
npx hardhat compile

# 4. 运行测试
npx hardhat test

# 5. 部署到本地节点
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

## 📁 项目结构

```
agent-task-market/
├── contracts/          # 智能合约
│   ├── AgentTaskMarket.sol    # 主市场合约
│   ├── ReputationSystem.sol   # 声誉系统
│   ├── ATMToken.sol           # 代币合约
│   └── scripts/deploy.js      # 部署脚本
├── backend/            # 后端 (待开发)
├── frontend/           # 前端 (待开发)
└── docs/               # 文档
```

## 🔧 开发命令

### 合约开发
```bash
npx hardhat compile      # 编译合约
npx hardhat test         # 运行测试
npx hardhat node         # 启动本地节点
npx hardhat deploy       # 部署合约
```

### 常用操作
```bash
# 检查合约大小
npx hardhat size-contracts

# 生成 ABI
npx hardhat export-abi

# 验证合约
npx hardhat verify --network polygon <address>
```

## 📚 文档

- [产品需求文档](./docs/PRD.md)
- [技术架构](./docs/ARCHITECTURE.md)
- [智能合约规范](./docs/CONTRACT_SPEC.md)
- [API 文档](./docs/API.md)

## 🎯 开发计划

1. **Week 1**: 智能合约测试与部署
2. **Week 2**: 后端 API 开发
3. **Week 3**: 前端界面开发
4. **Week 4**: 集成测试

## 💡 提示

- 使用 Cursor Agent 模式 (`Cmd + K`) 加速开发
- 查看 `.cursorrules` 了解编码规范
- 运行 `@openclaw_status` 检查环境

---

**开始开发吧！**
