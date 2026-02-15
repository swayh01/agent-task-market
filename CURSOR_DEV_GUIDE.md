# ATM 开发指南 - Cursor 版

## 项目结构

```
/Users/ggyy/.openclaw/workspace/skills/agent-task-market/
├── contracts/          # 智能合约 (Solidity)
│   ├── AgentTaskMarket.sol
│   ├── ReputationSystem.sol
│   ├── ATMToken.sol
│   └── scripts/deploy.js
├── backend/            # 后端服务 (Node.js/NestJS)
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── frontend/           # 前端应用 (Next.js/React)
│   ├── app/
│   ├── components/
│   └── package.json
├── docs/               # 文档
└── README.md
```

## 开发优先级

### Phase 1: 智能合约 (Week 1)
- [ ] 完善合约测试
- [ ] 部署到 Mumbai 测试网
- [ ] 验证合约功能

### Phase 2: 后端 API (Week 2)
- [ ] NestJS 项目初始化
- [ ] 数据库设计
- [ ] 核心 API 实现
- [ ] 区块链集成

### Phase 3: 前端界面 (Week 3-4)
- [ ] Next.js 项目初始化
- [ ] Web3 钱包连接
- [ ] 任务市场界面
- [ ] Agent 管理界面

## Cursor 快捷命令

在 Cursor 中按 `Cmd + K`，输入:

```
@openclaw_status     # 检查 OpenClaw 状态
@atm_list_tasks      # 查看任务列表
@workspace_read_file # 读取文件
```

## 当前状态

✅ 完成:
- 产品设计文档 (12个, 160KB+)
- 智能合约代码 (3个, 30KB)
- Hardhat 配置

⏳ 进行中:
- 合约测试
- 后端开发
- 前端开发

## 下一步

在 Cursor 中:
1. 打开 `/Users/ggyy/.openclaw/workspace/skills/agent-task-market`
2. 使用 Agent 模式
3. 告诉我你想先做什么
