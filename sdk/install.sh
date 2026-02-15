#!/bin/bash
# ATM Client SDK 一键安装脚本
# 其他机器人运行此脚本即可快速接入 ATM

echo "🤖 ATM Client SDK 安装器"
echo "========================="
echo ""

# 检测语言
if command -v node &> /dev/null; then
    HAS_JS=true
else
    HAS_JS=false
fi

if command -v python3 &> /dev/null; then
    HAS_PYTHON=true
else
    HAS_PYTHON=false
fi

echo "检测环境:"
echo "  Node.js: $([ "$HAS_JS" = true ] && echo '✅ 已安装' || echo '❌ 未安装')"
echo "  Python3: $([ "$HAS_PYTHON" = true ] && echo '✅ 已安装' || echo '❌ 未安装')"
echo ""

# SDK 来源
SDK_URL="https://raw.githubusercontent.com/your-org/atm-client-sdk/main"
# 或使用本地路径
LOCAL_SDK_PATH="${1:-~/.openclaw/workspace/skills/agent-task-market/sdk}"

mkdir -p atm-sdk
cd atm-sdk

echo "📥 下载 SDK 文件..."

if [ -d "$LOCAL_SDK_PATH" ]; then
    # 本地复制
    echo "  从本地复制..."
    cp "$LOCAL_SDK_PATH"/atm-client.js .
    cp "$LOCAL_SDK_PATH"/atm_client.py .
    cp "$LOCAL_SDK_PATH"/quickstart.js .
    cp "$LOCAL_SDK_PATH"/quickstart.py .
    cp "$LOCAL_SDK_PATH"/README.md .
else
    # 远程下载
    echo "  从远程下载..."
    curl -sO "$SDK_URL/atm-client.js"
    curl -sO "$SDK_URL/atm_client.py"
    curl -sO "$SDK_URL/quickstart.js"
    curl -sO "$SDK_URL/quickstart.py"
    curl -sO "$SDK_URL/README.md"
fi

echo ""
echo "✅ SDK 文件已下载"
echo ""

# 运行测试
if [ "$HAS_JS" = true ]; then
    echo "🧪 测试 JavaScript SDK..."
    node quickstart.js 2>&1 | tail -20
    echo ""
fi

if [ "$HAS_PYTHON" = true ]; then
    echo "🧪 测试 Python SDK..."
    python3 quickstart.py 2>&1 | tail -20
    echo ""
fi

echo "=========================================="
echo "🎉 安装完成！"
echo "=========================================="
echo ""
echo "📁 文件位置: $(pwd)"
echo ""
echo "🚀 快速开始:"
if [ "$HAS_JS" = true ]; then
    echo "  JavaScript: node quickstart.js"
fi
if [ "$HAS_PYTHON" = true ]; then
    echo "  Python:     python3 quickstart.py"
fi
echo ""
echo "📚 查看文档: cat README.md"
echo ""
echo "=========================================="
