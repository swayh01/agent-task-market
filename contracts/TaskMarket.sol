// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentTaskMarket
 * @dev 机器人任务交易平台主合约
 */
contract AgentTaskMarket is ReentrancyGuard, Pausable, Ownable {
    
    // ============ 枚举 ============
    enum TaskStatus {
        PUBLISHED,      // 已发布
        BIDDING,        // 竞标中
        ASSIGNED,       // 已分配
        IN_PROGRESS,    // 进行中
        SUBMITTED,      // 已提交
        VERIFIED,       // 已验证
        COMPLETED,      // 已完成
        CANCELLED,      // 已取消
        EXPIRED,        // 已过期
        DISPUTED        // 争议中
    }
    
    enum TaskType {
        INSTANT,        // 即时任务
        COMPUTE,        // 计算任务
        COLLABORATIVE,  // 协作任务
        SPECIALIZED     // 专业任务
    }
    
    // ============ 结构体 ============
    struct Task {
        uint256 id;
        address publisher;
        address executor;
        string title;
        string description;
        string requirements;    // JSON 格式技能要求
        TaskType taskType;
        TaskStatus status;
        uint256 reward;
        uint256 deadline;
        uint256 createdAt;
        uint256 assignedAt;
        uint256 completedAt;
        string resultCID;       // IPFS 结果哈希
        uint256 platformFee;    // 平台费用 (1-2%)
    }
    
    struct Bid {
        address executor;
        uint256 proposedReward;
        uint256 estimatedTime;
        string capabilities;    // JSON 格式能力证明
        uint256 reputation;
        uint256 timestamp;
    }
    
    // ============ 状态变量 ============
    uint256 public taskCounter;
    uint256 public platformFeePercent = 100; // 1% (以基点表示)
    
    mapping(uint256 => Task) public tasks;
    mapping(uint256 => Bid[]) public taskBids;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public reputationScores;
    mapping(address => uint256) public completedTasks;
    
    // ============ 事件 ============
    event TaskPublished(
        uint256 indexed taskId,
        address indexed publisher,
        uint256 reward,
        TaskType taskType
    );
    
    event BidSubmitted(
        uint256 indexed taskId,
        address indexed executor,
        uint256 proposedReward
    );
    
    event TaskAssigned(
        uint256 indexed taskId,
        address indexed executor,
        uint256 finalReward
    );
    
    event WorkSubmitted(
        uint256 indexed taskId,
        address indexed executor,
        string resultCID
    );
    
    event TaskCompleted(
        uint256 indexed taskId,
        address indexed publisher,
        address indexed executor,
        uint256 reward
    );
    
    event RewardClaimed(
        address indexed executor,
        uint256 amount
    );
    
    event DisputeRaised(
        uint256 indexed taskId,
        address indexed raiser,
        string reason
    );
    
    // ============ 修饰器 ============
    modifier onlyPublisher(uint256 _taskId) {
        require(tasks[_taskId].publisher == msg.sender, "Not publisher");
        _;
    }
    
    modifier onlyExecutor(uint256 _taskId) {
        require(tasks[_taskId].executor == msg.sender, "Not executor");
        _;
    }
    
    modifier validTask(uint256 _taskId) {
        require(_taskId > 0 && _taskId <= taskCounter, "Invalid task ID");
        _;
    }
    
    // ============ 核心函数 ============
    
    /**
     * @dev 发布任务
     */
    function publishTask(
        string calldata _title,
        string calldata _description,
        string calldata _requirements,
        TaskType _taskType,
        uint256 _deadline,
        bool _allowBidding
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        require(msg.value > 0, "Reward must be > 0");
        require(_deadline > block.timestamp, "Deadline must be future");
        require(bytes(_title).length > 0, "Title required");
        
        taskCounter++;
        uint256 taskId = taskCounter;
        
        uint256 platformFee = (msg.value * platformFeePercent) / 10000;
        
        tasks[taskId] = Task({
            id: taskId,
            publisher: msg.sender,
            executor: address(0),
            title: _title,
            description: _description,
            requirements: _requirements,
            taskType: _taskType,
            status: _allowBidding ? TaskStatus.BIDDING : TaskStatus.PUBLISHED,
            reward: msg.value - platformFee,
            deadline: _deadline,
            createdAt: block.timestamp,
            assignedAt: 0,
            completedAt: 0,
            resultCID: "",
            platformFee: platformFee
        });
        
        emit TaskPublished(taskId, msg.sender, msg.value, _taskType);
        
        return taskId;
    }
    
    /**
     * @dev 提交竞标
     */
    function bidOnTask(
        uint256 _taskId,
        uint256 _proposedReward,
        uint256 _estimatedTime,
        string calldata _capabilities
    ) external validTask(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.BIDDING, "Not in bidding phase");
        require(task.publisher != msg.sender, "Publisher cannot bid");
        require(_proposedReward <= task.reward, "Reward too high");
        require(block.timestamp < task.deadline, "Task expired");
        
        taskBids[_taskId].push(Bid({
            executor: msg.sender,
            proposedReward: _proposedReward,
            estimatedTime: _estimatedTime,
            capabilities: _capabilities,
            reputation: reputationScores[msg.sender],
            timestamp: block.timestamp
        }));
        
        emit BidSubmitted(_taskId, msg.sender, _proposedReward);
    }
    
    /**
     * @dev 分配任务给执行者
     */
    function assignTask(
        uint256 _taskId,
        address _executor
    ) external validTask(_taskId) onlyPublisher(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.PUBLISHED || task.status == TaskStatus.BIDDING, "Invalid status");
        require(block.timestamp < task.deadline, "Task expired");
        
        task.executor = _executor;
        task.status = TaskStatus.ASSIGNED;
        task.assignedAt = block.timestamp;
        
        emit TaskAssigned(_taskId, _executor, task.reward);
    }
    
    /**
     * @dev 选择竞标并分配任务
     */
    function acceptBid(
        uint256 _taskId,
        uint256 _bidIndex
    ) external validTask(_taskId) onlyPublisher(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.BIDDING, "Not in bidding phase");
        require(_bidIndex < taskBids[_taskId].length, "Invalid bid index");
        
        Bid memory selectedBid = taskBids[_taskId][_bidIndex];
        task.executor = selectedBid.executor;
        task.reward = selectedBid.proposedReward;
        task.status = TaskStatus.ASSIGNED;
        task.assignedAt = block.timestamp;
        
        // 退还多余资金给发布者
        uint256 refund = address(this).balance - task.reward - task.platformFee;
        if (refund > 0) {
            payable(task.publisher).transfer(refund);
        }
        
        emit TaskAssigned(_taskId, selectedBid.executor, selectedBid.proposedReward);
    }
    
    /**
     * @dev 接受任务（直接认领，无需竞标）
     */
    function acceptTask(uint256 _taskId) external validTask(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.PUBLISHED, "Not available");
        require(task.publisher != msg.sender, "Cannot accept own task");
        require(block.timestamp < task.deadline, "Task expired");
        
        task.executor = msg.sender;
        task.status = TaskStatus.IN_PROGRESS;
        task.assignedAt = block.timestamp;
        
        emit TaskAssigned(_taskId, msg.sender, task.reward);
    }
    
    /**
     * @dev 提交工作成果
     */
    function submitWork(
        uint256 _taskId,
        string calldata _resultCID
    ) external validTask(_taskId) onlyExecutor(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.IN_PROGRESS || task.status == TaskStatus.ASSIGNED, "Invalid status");
        require(block.timestamp <= task.deadline, "Deadline passed");
        require(bytes(_resultCID).length > 0, "Result required");
        
        task.resultCID = _resultCID;
        task.status = TaskStatus.SUBMITTED;
        
        emit WorkSubmitted(_taskId, msg.sender, _resultCID);
    }
    
    /**
     * @dev 验证并完成任务
     */
    function verifyAndComplete(
        uint256 _taskId,
        bool _approved
    ) external validTask(_taskId) onlyPublisher(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.SUBMITTED, "Not submitted");
        
        if (_approved) {
            task.status = TaskStatus.VERIFIED;
            _completeTask(_taskId);
        } else {
            task.status = TaskStatus.DISPUTED;
            emit DisputeRaised(_taskId, msg.sender, "Work rejected by publisher");
        }
    }
    
    /**
     * @dev 自动完成（超时自动通过）
     */
    function autoComplete(uint256 _taskId) external validTask(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.SUBMITTED, "Not submitted");
        require(block.timestamp > task.deadline + 3 days, "Review period not over");
        
        _completeTask(_taskId);
    }
    
    /**
     * @dev 内部完成函数
     */
    function _completeTask(uint256 _taskId) internal {
        Task storage task = tasks[_taskId];
        
        task.status = TaskStatus.COMPLETED;
        task.completedAt = block.timestamp;
        
        // 更新声誉
        reputationScores[task.executor] += 10;
        completedTasks[task.executor]++;
        
        // 添加奖励到执行者余额
        balances[task.executor] += task.reward;
        
        emit TaskCompleted(_taskId, task.publisher, task.executor, task.reward);
    }
    
    /**
     * @dev 提取收益
     */
    function claimReward() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit RewardClaimed(msg.sender, amount);
    }
    
    /**
     * @dev 取消任务
     */
    function cancelTask(uint256 _taskId) external validTask(_taskId) onlyPublisher(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(
            task.status == TaskStatus.PUBLISHED || 
            task.status == TaskStatus.BIDDING,
            "Cannot cancel"
        );
        
        task.status = TaskStatus.CANCELLED;
        
        // 退还奖励
        uint256 refund = task.reward + task.platformFee;
        payable(task.publisher).transfer(refund);
    }
    
    // ============ 视图函数 ============
    
    function getTask(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }
    
    function getBids(uint256 _taskId) external view returns (Bid[] memory) {
        return taskBids[_taskId];
    }
    
    function getAvailableTasks() external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](taskCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= taskCounter; i++) {
            if (tasks[i].status == TaskStatus.PUBLISHED || tasks[i].status == TaskStatus.BIDDING) {
                temp[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }
    
    function getMyTasks(address _user) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](taskCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= taskCounter; i++) {
            if (tasks[i].publisher == _user || tasks[i].executor == _user) {
                temp[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }
    
    // ============ 管理函数 ============
    
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 500, "Fee too high"); // 最大 5%
        platformFeePercent = _newFee;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    receive() external payable {}
}
