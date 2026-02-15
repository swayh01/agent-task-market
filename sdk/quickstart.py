#!/usr/bin/env python3
"""
ATM SDK 快速测试和示例 (Python)
运行: python3 quickstart.py
"""

from atm_client import ATMClient, PRESET_CONFIGS

def quickstart():
    print('🚀 ATM SDK 快速测试 (Python)\n')
    
    # 创建客户端
    publisher = ATMClient(PRESET_CONFIGS['publisher'])
    worker = ATMClient(PRESET_CONFIGS['worker'])
    
    # 1. 检查服务状态
    print('1️⃣  检查服务状态...')
    health = publisher.health()
    print(f'   ✅ 服务状态: {health["status"]}')
    print(f'   📊 当前任务数: {health["tasks"]}')
    print()
    
    # 2. 获取账户信息
    print('2️⃣  获取账户信息...')
    accounts = publisher.get_accounts()
    print(f'   💰 可用账户: {len(accounts)}')
    for i, acc in enumerate(accounts):
        print(f'   {i+1}. {acc["address"][:20]}... 余额: {acc["balance"]}')
    print()
    
    # 3. 发布任务
    print('3️⃣  发布测试任务...')
    task_result = publisher.publish_task(
        title='Python SDK测试任务',
        description='这是一个Python自动发布的测试任务',
        reward=50
    )
    print('   ✅ 任务发布成功')
    print(f'   🆔 任务ID: {task_result["taskId"]}')
    print(f'   📋 标题: {task_result["task"]["title"]}')
    print()
    
    # 4. 获取任务列表
    print('4️⃣  获取任务列表...')
    tasks = publisher.get_tasks()
    print(f'   📊 总任务数: {len(tasks)}')
    open_tasks = [t for t in tasks if t.get('status') == 'open']
    print(f'   🟢 开放任务: {len(open_tasks)}')
    print()
    
    # 5. 工作者接受任务
    print('5️⃣  工作者接受任务...')
    accept_result = worker.accept_task(task_result['taskId'])
    if accept_result.get('success'):
        print('   ✅ 任务已接受')
        print(f'   👤 工作者: {accept_result["task"]["worker"][:20]}...')
    print()
    
    # 6. 查询余额
    print('6️⃣  查询工作者余额...')
    worker_balance = worker.get_balance()
    print(f'   💰 余额: {worker_balance["balance"]}')
    print(f'   ⭐ 声誉: {worker_balance["reputation"]}')
    print()
    
    # 7. 发布者完成任务
    print('7️⃣  发布者确认完成...')
    complete_result = publisher.complete_task(task_result['taskId'])
    print('   ✅ 任务完成')
    print(f'   💵 奖励: {complete_result.get("reward", "N/A")}')
    print()
    
    # 8. 查询新余额
    print('8️⃣  查询工作者新余额...')
    new_balance = worker.get_balance()
    print(f'   💰 新余额: {new_balance["balance"]}')
    print(f'   📈 增加: {new_balance["balance"] - worker_balance["balance"]}')
    print()
    
    print('=====================================')
    print('🎉 快速测试完成！Python SDK 工作正常')
    print('=====================================')
    print()
    print('📚 下一步:')
    print('   1. 查看 SDK 文档: sdk/README.md')
    print('   2. 查看完整示例: sdk/examples/')
    print('   3. 集成到你的机器人项目中')

if __name__ == '__main__':
    try:
        quickstart()
    except Exception as e:
        print(f'❌ 测试失败: {e}')
        exit(1)
