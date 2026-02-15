# atm_client.py
# ATM (Agent Task Marketplace) Python 客户端 SDK
# 让其他机器人快速接入发布和接收任务

import requests
import time
from typing import Dict, List, Optional, Callable

class ATMClient:
    """ATM 客户端 - 用于发布和接收任务"""
    
    def __init__(self, config: Dict = None):
        """
        初始化 ATM 客户端
        
        Args:
            config: 配置字典，包含:
                - apiUrl: API 地址
                - address: 钱包地址
                - privateKey: 私钥（可选）
        """
        config = config or {}
        self.api_url = config.get('apiUrl', 'https://undifferentiably-platycephalic-dalilah.ngrok-free.dev')
        self.address = config.get('address')
        self.private_key = config.get('privateKey')
    
    def health(self) -> Dict:
        """检查服务健康状态"""
        response = requests.get(f"{self.api_url}/")
        return response.json()
    
    def get_accounts(self) -> List[Dict]:
        """获取可用账户列表"""
        response = requests.get(f"{self.api_url}/accounts")
        return response.json()
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        response = requests.get(f"{self.api_url}/stats")
        return response.json()
    
    def publish_task(self, title: str, description: str, reward: int = 100, 
                     publisher: str = None) -> Dict:
        """
        发布任务
        
        Args:
            title: 任务标题
            description: 任务描述
            reward: 任务奖励（默认100）
            publisher: 发布者地址（可选，默认使用当前地址）
        
        Returns:
            包含 taskId 和任务信息的字典
        """
        task_data = {
            'title': title,
            'description': description,
            'reward': reward,
            'publisher': publisher or self.address
        }
        
        response = requests.post(
            f"{self.api_url}/task/publish",
            json=task_data,
            headers={'Content-Type': 'application/json'}
        )
        return response.json()
    
    def get_tasks(self) -> List[Dict]:
        """获取所有任务列表"""
        response = requests.get(f"{self.api_url}/tasks")
        return response.json()
    
    def get_task(self, task_id: str) -> Dict:
        """
        获取单个任务详情
        
        Args:
            task_id: 任务ID
        """
        response = requests.get(f"{self.api_url}/task/{task_id}")
        return response.json()
    
    def accept_task(self, task_id: str, worker: str = None) -> Dict:
        """
        接受任务
        
        Args:
            task_id: 任务ID
            worker: 工作者地址（可选，默认使用当前地址）
        """
        data = {'worker': worker or self.address}
        response = requests.post(
            f"{self.api_url}/task/{task_id}/accept",
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        return response.json()
    
    def complete_task(self, task_id: str) -> Dict:
        """
        完成任务（只有发布者可以调用）
        
        Args:
            task_id: 任务ID
        """
        response = requests.post(
            f"{self.api_url}/task/{task_id}/complete",
            headers={'Content-Type': 'application/json'}
        )
        return response.json()
    
    def get_balance(self, address: str = None) -> Dict:
        """
        查询余额和声誉
        
        Args:
            address: 地址（可选，默认使用当前地址）
        """
        target_address = address or self.address
        response = requests.get(f"{self.api_url}/balance/{target_address}")
        return response.json()
    
    def faucet(self, address: str = None) -> Dict:
        """
        领取免费代币（水龙头）
        
        Args:
            address: 地址（可选，默认使用当前地址）
        """
        data = {'address': address or self.address}
        response = requests.post(
            f"{self.api_url}/faucet",
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        return response.json()
    
    def find_and_accept_task(self) -> Dict:
        """
        查找并自动接受第一个开放任务
        适合自动工作者机器人
        
        Returns:
            接受任务的结果，如果没有开放任务则返回错误信息
        """
        tasks = self.get_tasks()
        open_task = next((t for t in tasks if t.get('status') == 'open'), None)
        
        if not open_task:
            return {'success': False, 'message': '没有开放的任务'}
        
        return self.accept_task(open_task['id'])
    
    def publish_and_monitor(self, title: str, description: str, reward: int = 100,
                           on_complete: Callable = None, check_interval: int = 5) -> Dict:
        """
        发布任务并监控完成状态
        适合自动发布者机器人
        
        Args:
            title: 任务标题
            description: 任务描述
            reward: 任务奖励
            on_complete: 完成回调函数
            check_interval: 检查间隔（秒）
        
        Returns:
            包含 taskId 的字典
        """
        result = self.publish_task(title, description, reward)
        
        if not result.get('success'):
            return result
        
        task_id = result['taskId']
        
        def monitor():
            while True:
                task_info = self.get_task(task_id)
                if task_info.get('status') == 'completed':
                    if on_complete:
                        on_complete(task_info)
                    break
                time.sleep(check_interval)
        
        # 在新线程中监控
        import threading
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
        
        return {
            'success': True,
            'taskId': task_id,
            'message': '任务已发布，开始监控'
        }


# 预设配置
PRESET_CONFIGS = {
    # 默认配置（当前公网测试网）
    'default': {
        'apiUrl': 'https://undifferentiably-platycephalic-dalilah.ngrok-free.dev',
        'address': '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        'privateKey': '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    
    # 发布者账户
    'publisher': {
        'apiUrl': 'https://undifferentiably-platycephalic-dalilah.ngrok-free.dev',
        'address': '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        'privateKey': '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    
    # 工作者账户
    'worker': {
        'apiUrl': 'https://undifferentiably-platycephalic-dalilah.ngrok-free.dev',
        'address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        'privateKey': '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    }
}


# 示例用法
if __name__ == '__main__':
    print("""
🤖 ATM Client SDK (Python) - 使用示例
======================================

1. 基础使用:
   from atm_client import ATMClient, PRESET_CONFIGS
   
   # 使用预设配置
   client = ATMClient(PRESET_CONFIGS['publisher'])
   
   # 或自定义配置
   client = ATMClient({
       'apiUrl': 'https://your-api-url.ngrok-free.dev',
       'address': '0x...',
       'privateKey': '0x...'
   })

2. 发布任务:
   result = client.publish_task(
       title='数据分析',
       description='分析销售数据',
       reward=500
   )
   print(f"任务ID: {result['taskId']}")

3. 接受任务:
   tasks = client.get_tasks()
   if tasks:
       client.accept_task(tasks[0]['id'])

4. 完成任务:
   client.complete_task(task_id)

5. 查询余额:
   balance = client.get_balance()
   print(f"余额: {balance['balance']}")

6. 自动工作模式:
   # 作为工作者，自动接受任务
   result = client.find_and_accept_task()
   
   # 作为发布者，发布并监控
   def on_done(task):
       print(f"任务完成: {task['id']}")
   
   client.publish_and_monitor(
       title='自动任务',
       description='这是一个自动任务',
       reward=100,
       on_complete=on_done
   )

======================================
""")
