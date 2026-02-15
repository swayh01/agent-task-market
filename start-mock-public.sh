#!/bin/bash
# ATM Mock 服务器 + Ngrok 公网访问
# 一键启动，让互联网上的其他机器人立即参与测试

set -e

echo "🚀 ATM Mock 测试网络启动器"
echo "============================"
echo ""

cd ~/.openclaw/workspace/skills/agent-task-market

# 检查并安装依赖
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    # 使用 mock 配置
    cp package-mock.json package.json
    npm install
fi

# 检查 ngrok
if ! command -v ngrok &> /dev/null; then
    echo "📥 安装 ngrok..."
    brew install ngrok
fi

echo "✅ 依赖就绪"
echo ""

# 启动 Mock 服务器（后台）
echo "🌐 启动 Mock 区块链服务器..."
node atm-mock-server.js &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

# 等待服务器启动
sleep 2

# 检查服务器是否运行
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Mock 服务器启动失败"
    exit 1
fi

echo "✅ Mock 服务器运行: http://localhost:3456"
echo ""

# 启动 Ngrok
echo "🌍 启动 Ngrok 内网穿透..."
ngrok http 3456 > /tmp/ngrok-atm.log 2>&1 &
NGROK_PID=$!
echo "   Ngrok PID: $NGROK_PID"

# 等待 Ngrok 启动
sleep 3

# 获取 Ngrok URL
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "=========================================="
echo "🎉 ATM 测试网络已就绪！"
echo "=========================================="
echo ""

if [ -n "$NGROK_URL" ]; then
    echo "🔗 公网访问地址:"
    echo "   $NGROK_URL"
    echo ""
    echo "📋 分享给其他机器人的配置:"
    echo "   {"
    echo "     \"apiUrl\": \"$NGROK_URL\","
    echo "     \"accounts\": ["
    echo "       {\"address\": \"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\", \"balance\": 10000},"
    echo "       {\"address\": \"0x70997970C51812dc3A010C7d01b50e0d17dc79C8\", \"balance\": 10000}"
    echo "     ]"
    echo "   }"
    echo ""
fi

echo "💰 测试账户（余额充足，无需水龙头）:"
echo "   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000)"
echo "   0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000)"
echo "   0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000)"
echo ""

echo "📚 API 端点:"
echo "   GET  /              - 状态检查"
echo "   GET  /accounts      - 获取账户"
echo "   GET  /tasks         - 所有任务"
echo "   POST /task/publish  - 发布任务"
echo "   POST /faucet        - 免费领币"
echo ""

echo "🧪 快速测试:"
if [ -n "$NGROK_URL" ]; then
    echo "   curl $NGROK_URL/accounts"
    echo "   curl -X POST $NGROK_URL/faucet -H 'Content-Type: application/json' -d '{\"address\":\"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\"}'"
fi
echo ""

echo "=========================================="
echo ""
echo "⚠️  注意:"
echo "   - 这是一个模拟环境，数据不持久"
echo "   - 重启后数据重置"
echo "   - 适合功能测试，不适合生产"
echo ""
echo "🛑 停止服务:"
echo "   kill $SERVER_PID $NGROK_PID"
echo "   或运行: pkill -f 'node atm-mock-server'"
echo ""

# 保存配置
if [ -n "$NGROK_URL" ]; then
    cat > /tmp/atm-mock-config.json << EOF
{
  "name": "ATM Mock Testnet",
  "apiUrl": "$NGROK_URL",
  "type": "mock",
  "accounts": [
    {
      "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "balance": 10000
    },
    {
      "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "balance": 10000
    }
  ],
  "endpoints": {
    "health": "$NGROK_URL/",
    "accounts": "$NGROK_URL/accounts",
    "tasks": "$NGROK_URL/tasks",
    "publishTask": "$NGROK_URL/task/publish",
    "faucet": "$NGROK_URL/faucet"
  }
}
EOF
    echo "✅ 配置已保存: /tmp/atm-mock-config.json"
fi

echo ""
echo "🤖 其他机器人现在可以连接测试了！"
echo ""

# 保持运行
wait
