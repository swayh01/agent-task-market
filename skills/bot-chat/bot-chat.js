#!/usr/bin/env node
/**
 * Bot Chat - Agent 间通信系统
 * 让多个 OpenClaw Agent 能够通过 ATM 任务系统相互通信
 */

const { ATMClient, PRESET_CONFIGS } = require('../agent-task-market/sdk/atm-client.js');
const fs = require('fs');
const path = require('path');

class BotChat {
    constructor(config = {}) {
        this.name = config.name || process.env.BOT_NAME || 'Bot';
        this.partner = config.partner || process.env.BOT_PARTNER || 'Partner';
        this.atmConfig = config.atmConfig || PRESET_CONFIGS.publisher;
        this.client = new ATMClient(this.atmConfig);
        this.lastCheckTime = Date.now();
        this.seenTaskIds = new Set();
        this.isListening = false;
        this.listenInterval = null;
        this.historyFile = path.join(__dirname, '.chat-history.json');
    }

    /**
     * 发送消息给伙伴 Bot
     */
    async send(text) {
        try {
            const result = await this.client.publishTask({
                title: `Message from ${this.name}`,
                description: JSON.stringify({
                    type: 'bot-chat',
                    from: this.name,
                    to: this.partner,
                    message: text,
                    timestamp: Date.now(),
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }),
                reward: 1,
                publisher: this.name
            });

            if (result.success) {
                console.log(`[${this.name}] → [${this.partner}]: "${text}"`);
                this._saveToHistory({
                    direction: 'out',
                    to: this.partner,
                    text,
                    time: new Date().toISOString()
                });
                return { success: true, taskId: result.taskId };
            } else {
                console.error(`[${this.name}] 发送失败:`, result);
                return { success: false, error: result };
            }
        } catch (error) {
            console.error(`[${this.name}] 发送错误:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 接收伙伴 Bot 的消息
     */
    async receive() {
        try {
            const tasks = await this.client.getTasks();
            const messages = [];

            tasks.forEach(task => {
                // 跳过已读消息
                if (this.seenTaskIds.has(task.id)) return;
                
                // 只处理开放状态的任务
                if (task.status !== 'open') return;

                try {
                    const desc = JSON.parse(task.description);
                    
                    // 检查是否是发给我的消息
                    if (desc.type === 'bot-chat' && 
                        desc.to === this.name &&
                        desc.timestamp > this.lastCheckTime - 60000) { // 1分钟内的消息
                        
                        messages.push({
                            id: desc.id || task.id,
                            from: desc.from,
                            text: desc.message,
                            time: new Date(desc.timestamp),
                            taskId: task.id
                        });
                        
                        this.seenTaskIds.add(task.id);
                    }
                } catch (e) {
                    // 解析失败，跳过
                }
            });

            if (messages.length > 0) {
                this.lastCheckTime = Date.now();
                messages.forEach(msg => {
                    console.log(`[${this.name}] ← [${msg.from}]: "${msg.text}"`);
                    this._saveToHistory({
                        direction: 'in',
                        from: msg.from,
                        text: msg.text,
                        time: msg.time.toISOString()
                    });
                });
            }

            return messages;
        } catch (error) {
            console.error(`[${this.name}] 接收错误:`, error.message);
            return [];
        }
    }

    /**
     * 开始监听模式（持续接收消息）
     */
    startListening(callback, interval = 3000) {
        if (this.isListening) {
            console.log(`[${this.name}] 已经在监听中`);
            return;
        }

        this.isListening = true;
        console.log(`[${this.name}] 开始监听消息...`);

        this.listenInterval = setInterval(async () => {
            const messages = await this.receive();
            if (messages.length > 0 && callback) {
                messages.forEach(msg => callback(msg));
            }
        }, interval);
    }

    /**
     * 停止监听
     */
    stopListening() {
        if (this.listenInterval) {
            clearInterval(this.listenInterval);
            this.listenInterval = null;
        }
        this.isListening = false;
        console.log(`[${this.name}] 停止监听`);
    }

    /**
     * 获取聊天历史
     */
    getHistory() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const data = fs.readFileSync(this.historyFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('读取历史失败:', e.message);
        }
        return [];
    }

    /**
     * 保存到历史记录
     */
    _saveToHistory(entry) {
        try {
            const history = this.getHistory();
            history.push(entry);
            // 只保留最近 100 条
            if (history.length > 100) {
                history.shift();
            }
            fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
        } catch (e) {
            // 忽略保存错误
        }
    }

    /**
     * 检查系统状态
     */
    async status() {
        try {
            const health = await this.client.health();
            return {
                status: 'ok',
                atm: health,
                botName: this.name,
                partner: this.partner,
                isListening: this.isListening
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
}

/**
 * 多 Bot 群聊
 */
class BotGroupChat extends BotChat {
    constructor(config = {}) {
        super(config);
        this.group = config.group || 'default-group';
        this.partners = config.partners || [];
    }

    async sendToGroup(text) {
        return this.client.publishTask({
            title: `Group message from ${this.name}`,
            description: JSON.stringify({
                type: 'bot-group-chat',
                from: this.name,
                group: this.group,
                message: text,
                timestamp: Date.now()
            }),
            reward: 1
        });
    }

    async receiveFromGroup() {
        const tasks = await this.client.getTasks();
        return tasks.filter(task => {
            try {
                const desc = JSON.parse(task.description);
                return desc.type === 'bot-group-chat' &&
                       desc.group === this.group &&
                       desc.from !== this.name;
            } catch (e) {
                return false;
            }
        }).map(task => {
            const desc = JSON.parse(task.description);
            return {
                from: desc.from,
                text: desc.message,
                time: new Date(desc.timestamp)
            };
        });
    }
}

/**
 * 命令行接口
 */
async function cli() {
    const args = process.argv.slice(2);
    const command = args[0];

    const botName = process.env.BOT_NAME || 'BotA';
    const partnerName = process.env.BOT_PARTNER || 'BotB';
    const bot = new BotChat({ name: botName, partner: partnerName });

    switch (command) {
        case 'send':
            if (args.length < 3) {
                console.log('Usage: bot-chat send <to> <message>');
                process.exit(1);
            }
            bot.partner = args[1];
            const message = args.slice(2).join(' ');
            const result = await bot.send(message);
            process.exit(result.success ? 0 : 1);

        case 'receive':
            const messages = await bot.receive();
            if (messages.length === 0) {
                console.log(`[${botName}] 没有新消息`);
            }
            process.exit(0);

        case 'listen':
            bot.startListening((msg) => {
                console.log(`\n[${botName}] ← [${msg.from}]: "${msg.text}"`);
            });
            
            // 保持运行
            process.on('SIGINT', () => {
                bot.stopListening();
                process.exit(0);
            });
            break;

        case 'status':
            const status = await bot.status();
            console.log(JSON.stringify(status, null, 2));
            process.exit(0);

        case 'history':
            const history = bot.getHistory();
            console.log('聊天历史:');
            history.forEach(h => {
                const arrow = h.direction === 'out' ? '→' : '←';
                const who = h.direction === 'out' ? h.to : h.from;
                console.log(`  [${h.time}] ${arrow} [${who}]: "${h.text}"`);
            });
            process.exit(0);

        default:
            console.log(`
Bot Chat - Agent 间通信系统

用法:
  bot-chat send <to> <message>  发送消息
  bot-chat receive              接收消息
  bot-chat listen               监听模式
  bot-chat status               查看状态
  bot-chat history              查看历史

环境变量:
  BOT_NAME      你的 Bot 名称 (默认: BotA)
  BOT_PARTNER   对方 Bot 名称 (默认: BotB)

示例:
  BOT_NAME=BotA BOT_PARTNER=BotB bot-chat send BotB "你好！"
  BOT_NAME=BotB BOT_PARTNER=BotA bot-chat receive
`);
            process.exit(0);
    }
}

// 导出模块
module.exports = { BotChat, BotGroupChat };

// 如果是直接运行
if (require.main === module) {
    cli().catch(console.error);
}
