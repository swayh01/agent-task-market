// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title MockATM
 * @dev 模拟版 ATM 合约，用于本地测试，无需真实代币
 */
contract MockATM {
    // 任务状态
    enum TaskStatus { Open, InProgress, Completed, Cancelled }
    
    // 任务结构
    struct Task {
        address publisher;
        address worker;
        string title;
        string description;
        uint256 reward;
        TaskStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }
    
    // 存储
    mapping(bytes32 => Task) public tasks;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public reputations;
    
    bytes32[] public taskIds;
    
    // 事件
    event TaskPublished(bytes32 indexed taskId, address indexed publisher, uint256 reward);
    event TaskAccepted(bytes32 indexed taskId, address indexed worker);
    event TaskCompleted(bytes32 indexed taskId, address indexed worker, uint256 reward);
    event RewardClaimed(address indexed user, uint256 amount);
    
    /**
     * @dev 发布任务（无需真实代币）
     */
    function publishTask(
        bytes32 taskId,
        string memory title,
        string memory description,
        uint256 reward
    ) external returns (bool) {
        require(tasks[taskId].publisher == address(0), "Task already exists");
        
        tasks[taskId] = Task({
            publisher: msg.sender,
            worker: address(0),
            title: title,
            description: description,
            reward: reward,
            status: TaskStatus.Open,
            createdAt: block.timestamp,
            completedAt: 0
        });
        
        taskIds.push(taskId);
        
        emit TaskPublished(taskId, msg.sender, reward);
        return true;
    }
    
    /**
     * @dev 接受任务
     */
    function acceptTask(bytes32 taskId) external returns (bool) {
        Task storage task = tasks[taskId];
        require(task.publisher != address(0), "Task not found");
        require(task.status == TaskStatus.Open, "Task not open");
        require(task.publisher != msg.sender, "Cannot accept own task");
        
        task.worker = msg.sender;
        task.status = TaskStatus.InProgress;
        
        emit TaskAccepted(taskId, msg.sender);
        return true;
    }
    
    /**
     * @dev 完成任务（自动发放模拟奖励）
     */
    function completeTask(bytes32 taskId) external returns (bool) {
        Task storage task = tasks[taskId];
        require(task.publisher == msg.sender, "Only publisher can complete");
        require(task.status == TaskStatus.InProgress, "Task not in progress");
        
        task.status = TaskStatus.Completed;
        task.completedAt = block.timestamp;
        
        // 发放模拟奖励
        balances[task.worker] += task.reward;
        reputations[task.worker] += 10;
        
        emit TaskCompleted(taskId, task.worker, task.reward);
        return true;
    }
    
    /**
     * @dev 获取任务详情
     */
    function getTask(bytes32 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }
    
    /**
     * @dev 获取所有任务ID
     */
    function getAllTaskIds() external view returns (bytes32[] memory) {
        return taskIds;
    }
    
    /**
     * @dev 获取用户余额（模拟代币）
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev 获取用户声誉
     */
    function getReputation(address user) external view returns (uint256) {
        return reputations[user];
    }
    
    /**
     * @dev 领取模拟代币（水龙头功能）
     */
    function faucet() external returns (uint256) {
        balances[msg.sender] += 1000;
        return balances[msg.sender];
    }
}
