#!/bin/bash
# ATM 本地测试网络启动脚本
# 让其他机器人无需水龙头即可参与测试

set -e

echo "🚀 ATM 本地测试网络启动器"
echo "=========================="
echo ""

# 检查依赖
echo "📦 检查依赖..."
if ! command -v ngrok &> /dev/null; then
    echo "安装 ngrok..."
    brew install ngrok
fi

if ! command -v node &> /dev/null; then
    echo "❌ 需要 Node.js"
    exit 1
fi

echo "✅ 依赖检查通过"
echo ""

# 进入项目目录
PROJECT_DIR="$HOME/.openclaw/workspace/skills/agent-task-market/contracts"
cd "$PROJECT_DIR" || {
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    exit 1
}

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
fi

echo ""
echo "📝 预置测试账户（自动创建，余额充足）："
echo "   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)"
echo "   Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)"
echo "   Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH)"
echo "   ... 共 20 个账户"
echo ""

# 启动 Hardhat 节点（后台）
echo "🌐 启动本地区块链网络..."
nohup npx hardhat node > /tmp/hardhat-node.log 2>&1 &
HARDHAT_PID=$!
echo "   PID: $HARDHAT_PID"

# 等待节点启动
echo "⏳ 等待网络启动..."
sleep 5

# 检查节点是否运行
if ! kill -0 $HARDHAT_PID 2>/dev/null; then
    echo "❌ Hardhat 节点启动失败"
    cat /tmp/hardhat-node.log
    exit 1
fi

echo "✅ 本地网络已启动: http://127.0.0.1:8545"
echo ""

# 部署合约
echo "📜 部署合约到本地网络..."
npx hardhat run scripts/deploy.js --network localhost 2>&1 | tee /tmp/deploy.log || {
    echo "⚠️ 部署脚本执行失败，使用简化部署..."
    # 创建简化部署脚本
    cat > /tmp/simple-deploy.js << 'DEPLOY'
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Deploy MockATM
    const MockATM = await hre.ethers.getContractFactory("MockATM");
    const mockATM = await MockATM.deploy();
    await mockATM.waitForDeployment();
    console.log("MockATM deployed to:", await mockATM.getAddress());
    
    // Save addresses
    const fs = require('fs');
    const addresses = {
        MockATM: await mockATM.getAddress(),
        network: "localhost",
        chainId: 31337
    };
    fs.writeFileSync('/tmp/contract-addresses.json', JSON.stringify(addresses, null, 2));
    console.log("\nContract addresses saved to /tmp/contract-addresses.json");
}

main().catch(console.error);
DEPLOY
    npx hardhat run /tmp/simple-deploy.js --network localhost
}

echo ""
echo "✅ 合约部署完成"
echo ""

# 启动 Ngrok
echo "🌍 启动内网穿透（Ngrok）..."
nohup ngrok http 8545 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "   PID: $NGROK_PID"

# 等待 Ngrok 启动
sleep 3

# 获取 Ngrok URL
echo "⏳ 获取公网地址..."
sleep 2
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "⚠️  无法获取 Ngrok URL，请检查:"
    echo "   ngrok.log: cat /tmp/ngrok.log"
    echo "   手动获取: curl http://127.0.0.1:4040/api/tunnels"
else
    echo ""
    echo "=========================================="
    echo "🎉 ATM 测试网络已就绪！"
    echo "=========================================="
    echo ""
    echo "🔗 公网访问地址:"
    echo "   $NGROK_URL"
    echo ""
    echo "📋 分享给其他机器人的配置:"
    echo "   RPC URL: $NGROK_URL"
    echo "   Chain ID: 31337"
    echo "   Currency: ETH"
    echo ""
    echo "💰 可用测试账户（私钥）:"
    echo "   Account #0: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo "   Account #1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    echo ""
    echo "📝 合约地址:"
    if [ -f /tmp/contract-addresses.json ]; then
        cat /tmp/contract-addresses.json
    else
        echo "   请查看部署日志: cat /tmp/deploy.log"
    fi
    echo ""
    echo "=========================================="
    echo ""
    echo "⚠️  注意:"
    echo "   - 此网络仅在本次会话有效"
    echo "   - 关闭终端后网络将停止"
    echo "   - 每次重启 Ngrok URL 会变化"
    echo ""
    echo "🛑 停止服务:"
    echo "   kill $HARDHAT_PID $NGROK_PID"
    echo ""
    
    # 保存配置
    cat > /tmp/atm-test-config.json << EOF
{
  "name": "ATM Local Testnet",
  "rpcUrl": "$NGROK_URL",
  "chainId": 31337,
  "currency": "ETH",
  "accounts": [
    {
      "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "balance": "10000"
    },
    {
      "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "balance": "10000"
    }
  ],
  "contracts": $(cat /tmp/contract-addresses.json 2>/dev/null || echo '{}')
}
EOF
    
    echo "✅ 配置已保存: /tmp/atm-test-config.json"
    echo ""
    echo "其他机器人可以使用上述配置立即开始测试！"
fi

echo ""
echo "查看日志:"
echo "   Hardhat: tail -f /tmp/hardhat-node.log"
echo "   Ngrok:   tail -f /tmp/ngrok.log"
