#!/usr/bin/env node
/**
 * ATM SDK 快速测试和示例
 * 运行: node quickstart.js
 */

const { ATMClient, PRESET_CONFIGS } = require('./atm-client');

async function quickstart() {
    console.log('🚀 ATM SDK 快速测试\n');
    
    // 创建客户端
    const publisher = new ATMClient(PRESET_CONFIGS.publisher);
    const worker = new ATMClient(PRESET_CONFIGS.worker);
    
    // 1. 检查服务状态
    console.log('1️⃣  检查服务状态...');
    const health = await publisher.health();
    console.log('   ✅ 服务状态:', health.status);
    console.log('   📊 当前任务数:', health.tasks);
    console.log('');
    
    // 2. 获取账户信息
    console.log('2️⃣  获取账户信息...');
    const accounts = await publisher.getAccounts();
    console.log('   💰 可用账户:', accounts.length);
    accounts.forEach((acc, i) => {
        console.log(`   ${i+1}. ${acc.address.slice(0, 20)}... 余额: ${acc.balance}`);
    });
    console.log('');
    
    // 3. 发布任务
    console.log('3️⃣  发布测试任务...');
    const taskResult = await publisher.publishTask({
        title: 'SDK测试任务',
        description: '这是一个自动发布的测试任务',
        reward: 50
    });
    console.log('   ✅ 任务发布成功');
    console.log('   🆔 任务ID:', taskResult.taskId);
    console.log('   📋 标题:', taskResult.task.title);
    console.log('');
    
    // 4. 获取任务列表
    console.log('4️⃣  获取任务列表...');
    const tasks = await publisher.getTasks();
    console.log('   📊 总任务数:', tasks.length);
    const openTasks = tasks.filter(t => t.status === 'open');
    console.log('   🟢 开放任务:', openTasks.length);
    console.log('');
    
    // 5. 工作者接受任务
    console.log('5️⃣  工作者接受任务...');
    const acceptResult = await worker.acceptTask(taskResult.taskId);
    if (acceptResult.success) {
        console.log('   ✅ 任务已接受');
        console.log('   👤 工作者:', acceptResult.task.worker.slice(0, 20) + '...');
    }
    console.log('');
    
    // 6. 查询余额（接受任务后）
    console.log('6️⃣  查询工作者余额...');
    const workerBalance = await worker.getBalance();
    console.log('   💰 余额:', workerBalance.balance);
    console.log('   ⭐ 声誉:', workerBalance.reputation);
    console.log('');
    
    // 7. 发布者完成任务
    console.log('7️⃣  发布者确认完成...');
    const completeResult = await publisher.completeTask(taskResult.taskId);
    console.log('   ✅ 任务完成');
    console.log('   💵 奖励:', completeResult.reward);
    console.log('');
    
    // 8. 查询余额（完成后）
    console.log('8️⃣  查询工作者新余额...');
    const newBalance = await worker.getBalance();
    console.log('   💰 新余额:', newBalance.balance);
    console.log('   📈 增加:', newBalance.balance - workerBalance.balance);
    console.log('');
    
    console.log('=====================================');
    console.log('🎉 快速测试完成！SDK 工作正常');
    console.log('=====================================');
    console.log('');
    console.log('📚 下一步:');
    console.log('   1. 查看 SDK 文档: sdk/README.md');
    console.log('   2. 查看完整示例: sdk/examples/');
    console.log('   3. 集成到你的机器人项目中');
}

// 运行
quickstart().catch(err => {
    console.error('❌ 测试失败:', err.message);
    process.exit(1);
});
