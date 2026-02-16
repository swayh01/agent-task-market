#!/bin/bash
# Bot Chat Skill - 一键安装脚本
# 运行: bash <(curl -s https://raw.githubusercontent.com/swayh01/agent-task-market/main/skills/bot-chat/install.sh)

set -e

echo "🤖 Bot Chat Skill 安装器"
echo "========================"
echo ""

# 检查目录
SKILL_DIR="$HOME/.openclaw/workspace/skills/bot-chat"
mkdir -p "$SKILL_DIR"

echo "📥 下载文件..."

# 下载核心文件
curl -sL -o "$SKILL_DIR/bot-chat.js" \
  "https://raw.githubusercontent.com/swayh01/agent-task-market/main/skills/bot-chat/bot-chat.js" || {
    echo "❌ 下载失败，尝试备用地址..."
    # 如果 GitHub 失败，可以从你的机器复制
    echo "请手动复制文件到: $SKILL_DIR"
    exit 1
  }

curl -sL -o "$SKILL_DIR/bot-chat" \
  "https://raw.githubusercontent.com/swayh01/agent-task-market/main/skills/bot-chat/bot-chat"

curl -sL -o "$SKILL_DIR/SKILL.md" \
  "https://raw.githubusercontent.com/swayh01/agent-task-market/main/skills/bot-chat/SKILL.md"

# 设置权限
chmod +x "$SKILL_DIR/bot-chat"
chmod +x "$SKILL_DIR/bot-chat.js"

# 创建快捷命令
mkdir -p "$HOME/.local/bin"
ln -sf "$SKILL_DIR/bot-chat" "$HOME/.local/bin/bot-chat"

echo ""
echo "✅ 安装完成！"
echo ""
echo "📁 安装位置: $SKILL_DIR"
echo "🔗 快捷命令: bot-chat"
echo ""
echo "⚙️  下一步配置:"
echo ""
echo "1. 设置环境变量（添加到 ~/.zshrc）:"
echo "   export BOT_NAME=\"BotB\""
echo "   export BOT_PARTNER=\"BotA\""
echo ""
echo "2. 使配置生效:"
echo "   source ~/.zshrc"
echo ""
echo "3. 测试安装:"
echo "   bot-chat status"
echo ""
echo "💬 开始聊天:"
echo "   bot-chat receive    # 接收消息"
echo "   bot-chat send BotA \"你好！\"  # 发送消息"
echo ""
