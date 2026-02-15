// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/**
 * @title AgentTaskMarket
 * @dev AI Agent 任务交易平台主合约
 * @author OpenClaw
 * @version 1.0.0
 */
contract AgentTaskMarket is 
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable 
{
    // ============ 角色定义 ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ============ 枚举 ============
    enum TaskStatus {
        NONE,
        PUBLISHED,
        BIDDING,
        ASSIGNED,
        IN_PROGRESS,
        SUBMITTED,
        VERIFIED,
        COMPLETED,
        CANCELLED,
        EXPIRED,
        DISPUTED
    }
    
    enum TaskType {
        INSTANT,
        COMPUTE,
        COLLABORATIVE,
        SPECIALIZED
    }
    
    enum DisputeStatus {
        NONE,
        PENDING,
        RESOLVED_PUBLISHER_WINS,
        RESOLVED_EXECUTOR_WINS,
        RESOLVED_SPLIT
    }
    
    // ============ 结构体 ============
    struct Task {
        uint256 id;
        address publisher;
        address executor;
        string title;
        string descriptionCID;
        string requirementsCID;
        TaskType taskType;
        TaskStatus status;
        uint256 reward;
        uint256 platformFee;
        uint256 deadline;
        uint256 createdAt;
        uint256 assignedAt;
        uint256 submittedAt;
        uint256 completedAt;
        string resultCID;
        DisputeStatus disputeStatus;
        bool allowBidding;
        uint8 minReputation;
    }
    
    struct Bid {
        uint256 id;
        uint256 taskId;
        address executor;
        uint256 proposedReward;
        uint256 estimatedTime;
        string pitchCID;
        uint256 createdAt;
        bool isActive;
    }
    
    struct Dispute {
        uint256 id;
        uint256 taskId;
        address raiser;
        string reasonCID;
        string evidenceCID;
        uint256 createdAt;
        uint256 resolvedAt;
        address resolver;
        DisputeStatus resolution;
        string resolutionNotesCID;
    }
    
    // ============ 状态变量 ============
    uint256 public taskCounter;
    uint256 public bidCounter;
    uint256 public disputeCounter;
    uint256 public platformFeePercent;
    uint256 public constant MAX_FEE = 500;
    uint256 public disputeWindow;
    uint256 public autoVerifyWindow;
    
    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) public userPublishedTasks;
    mapping(address => uint256[]) public userExecutingTasks;
    mapping(uint256 => Bid[]) public taskBids;
    mapping(uint256 => mapping(address => bool)) public hasBid;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => uint256) public taskToDispute;
    mapping(uint256 => uint256) public lockedFunds;
    
    address public reputationContract;
    address public treasury;
    
    // ============ 事件 ============
    event TaskCreated(
        uint256 indexed taskId,
        address indexed publisher,
        uint256 reward,
        TaskType taskType,
        uint256 deadline
    );
    
    event BidSubmitted(
        uint256 indexed bidId,
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
    
    event TaskVerified(
        uint256 indexed taskId,
        address indexed publisher,
        address indexed executor,
        uint256 reward
    );
    
    event TaskCompleted(
        uint256 indexed taskId,
        uint256 reward,
        uint256 platformFee
    );
    
    event TaskCancelled(
        uint256 indexed taskId,
        address indexed canceller,
        uint256 refund
    );
    
    event DisputeRaised(
        uint256 indexed disputeId,
        uint256 indexed taskId,
        address indexed raiser
    );
    
    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeStatus resolution,
        address indexed resolver
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
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
    
    // ============ 初始化 ============
    function initialize(
        address _admin,
        address _treasury
    ) public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        
        platformFeePercent = 200;
        disputeWindow = 3 days;
        autoVerifyWindow = 7 days;
        treasury = _treasury;
    }
    
    // ============ 核心功能 ============
    
    function createTask(
        string calldata _title,
        string calldata _descriptionCID,
        string calldata _requirementsCID,
        TaskType _taskType,
        uint256 _deadline,
        bool _allowBidding,
        uint8 _minReputation
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_title).length <= 200, "Title too long");
        require(_deadline > block.timestamp, "Deadline must be future");
        require(_deadline <= block.timestamp + 365 days, "Deadline too far");
        require(msg.value > 0, "Reward required");
        
        taskCounter++;
        uint256 taskId = taskCounter;
        
        uint256 fee = (msg.value * platformFeePercent) / 10000;
        uint256 reward = msg.value - fee;
        
        Task storage task = tasks[taskId];
        task.id = taskId;
        task.publisher = msg.sender;
        task.title = _title;
        task.descriptionCID = _descriptionCID;
        task.requirementsCID = _requirementsCID;
        task.taskType = _taskType;
        task.status = _allowBidding ? TaskStatus.BIDDING : TaskStatus.PUBLISHED;
        task.reward = reward;
        task.platformFee = fee;
        task.deadline = _deadline;
        task.createdAt = block.timestamp;
        task.allowBidding = _allowBidding;
        task.minReputation = _minReputation;
        
        lockedFunds[taskId] = msg.value;
        userPublishedTasks[msg.sender].push(taskId);
        
        emit TaskCreated(taskId, msg.sender, reward, _taskType, _deadline);
        
        return taskId;
    }
    
    function submitBid(
        uint256 _taskId,
        uint256 _proposedReward,
        uint256 _estimatedTime,
        string calldata _pitchCID
    ) external validTask(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.BIDDING, "Not bidding phase");
        require(task.publisher != msg.sender, "Cannot bid own task");
        require(_proposedReward <= task.reward, "Reward too high");
        require(!hasBid[_taskId][msg.sender], "Already bid");
        require(block.timestamp < task.deadline, "Task expired");
        
        bidCounter++;
        
        Bid memory bid = Bid({
            id: bidCounter,
            taskId: _taskId,
            executor: msg.sender,
            proposedReward: _proposedReward,
            estimatedTime: _estimatedTime,
            pitchCID: _pitchCID,
            createdAt: block.timestamp,
            isActive: true
        });
        
        taskBids[_taskId].push(bid);
        hasBid[_taskId][msg.sender] = true;
        
        emit BidSubmitted(bidCounter, _taskId, msg.sender, _proposedReward);
    }
    
    function acceptBid(
        uint256 _taskId,
        uint256 _bidIndex
    ) external validTask(_taskId) onlyPublisher(_taskId) whenNotPaused nonReentrant {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.BIDDING, "Not in bidding");
        require(_bidIndex < taskBids[_taskId].length, "Invalid bid");
        
        Bid storage bid = taskBids[_taskId][_bidIndex];
        require(bid.isActive, "Bid not active");
        
        task.executor = bid.executor;
        task.reward = bid.proposedReward;
        task.status = TaskStatus.ASSIGNED;
        task.assignedAt = block.timestamp;
        
        uint256 totalLocked = lockedFunds[_taskId];
        uint256 newTotal = bid.proposedReward + task.platformFee;
        if (totalLocked > newTotal) {
            uint256 refund = totalLocked - newTotal;
            lockedFunds[_taskId] = newTotal;
            payable(task.publisher).transfer(refund);
        }
        
        bid.isActive = false;
        userExecutingTasks[bid.executor].push(_taskId);
        
        emit TaskAssigned(_taskId, bid.executor, bid.proposedReward);
    }
    
    function acceptTask(uint256 _taskId) external validTask(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.PUBLISHED, "Not available");
        require(task.publisher != msg.sender, "Cannot accept own");
        require(block.timestamp < task.deadline, "Expired");
        
        task.executor = msg.sender;
        task.status = TaskStatus.IN_PROGRESS;
        task.assignedAt = block.timestamp;
        
        userExecutingTasks[msg.sender].push(_taskId);
        
        emit TaskAssigned(_taskId, msg.sender, task.reward);
    }
    
    function submitWork(
        uint256 _taskId,
        string calldata _resultCID
    ) external validTask(_taskId) onlyExecutor(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];
        require(
            task.status == TaskStatus.ASSIGNED || 
            task.status == TaskStatus.IN_PROGRESS,
            "Wrong status"
        );
        require(block.timestamp <= task.deadline, "Deadline passed");
        require(bytes(_resultCID).length > 0, "Result required");
        
        task.resultCID = _resultCID;
        task.status = TaskStatus.SUBMITTED;
        task.submittedAt = block.timestamp;
        
        emit WorkSubmitted(_taskId, msg.sender, _resultCID);
    }
    
    function verifyAndComplete(
        uint256 _taskId,
        bool _approved
    ) external validTask(_taskId) onlyPublisher(_taskId) whenNotPaused nonReentrant {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.SUBMITTED, "Not submitted");
        
        if (_approved) {
            task.status = TaskStatus.VERIFIED;
            _completeTask(_taskId);
        } else {
            task.status = TaskStatus.DISPUTED;
            _createDispute(_taskId, "Work rejected by publisher");
        }
    }
    
    function autoVerify(uint256 _taskId) external validTask(_taskId) whenNotPaused nonReentrant {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.SUBMITTED, "Not submitted");
        require(
            block.timestamp > task.submittedAt + autoVerifyWindow,
            "Auto verify window not passed"
        );
        
        task.status = TaskStatus.VERIFIED;
        _completeTask(_taskId);
    }
    
    function _completeTask(uint256 _taskId) internal {
        Task storage task = tasks[_taskId];
        
        task.status = TaskStatus.COMPLETED;
        task.completedAt = block.timestamp;
        
        uint256 reward = task.reward;
        uint256 fee = task.platformFee;
        
        lockedFunds[_taskId] = 0;
        
        (bool success, ) = payable(task.executor).call{value: reward}("");
        require(success, "Reward transfer failed");
        
        (bool feeSuccess, ) = payable(treasury).call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");
        
        emit TaskVerified(_taskId, task.publisher, task.executor, reward);
        emit TaskCompleted(_taskId, reward, fee);
    }
    
    function cancelTask(uint256 _taskId) external validTask(_taskId) whenNotPaused nonReentrant {
        Task storage task = tasks[_taskId];
        require(
            task.status == TaskStatus.PUBLISHED || 
            task.status == TaskStatus.BIDDING,
            "Cannot cancel"
        );
        require(
            task.publisher == msg.sender || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        task.status = TaskStatus.CANCELLED;
        
        uint256 refund = lockedFunds[_taskId];
        lockedFunds[_taskId] = 0;
        
        (bool success, ) = payable(task.publisher).call{value: refund}("");
        require(success, "Refund failed");
        
        emit TaskCancelled(_taskId, msg.sender, refund);
    }
    
    // ============ 争议处理 ============
    
    function _createDispute(uint256 _taskId, string memory _reasonCID) internal {
        disputeCounter++;
        
        Dispute storage dispute = disputes[disputeCounter];
        dispute.id = disputeCounter;
        dispute.taskId = _taskId;
        dispute.raiser = msg.sender;
        dispute.reasonCID = _reasonCID;
        dispute.createdAt = block.timestamp;
        dispute.resolution = DisputeStatus.PENDING;
        
        taskToDispute[_taskId] = disputeCounter;
        
        emit DisputeRaised(disputeCounter, _taskId, msg.sender);
    }
    
    function resolveDispute(
        uint256 _disputeId,
        DisputeStatus _resolution,
        string calldata _notesCID
    ) external onlyRole(ARBITER_ROLE) whenNotPaused nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.resolution == DisputeStatus.PENDING, "Already resolved");
        require(_resolution != DisputeStatus.PENDING, "Invalid resolution");
        
        Task storage task = tasks[dispute.taskId];
        
        dispute.resolution = _resolution;
        dispute.resolvedAt = block.timestamp;
        dispute.resolver = msg.sender;
        dispute.resolutionNotesCID = _notesCID;
        
        uint256 totalFunds = lockedFunds[dispute.taskId];
        lockedFunds[dispute.taskId] = 0;
        
        if (_resolution == DisputeStatus.RESOLVED_PUBLISHER_WINS) {
            payable(task.publisher).transfer(totalFunds);
        } else if (_resolution == DisputeStatus.RESOLVED_EXECUTOR_WINS) {
            payable(task.executor).transfer(task.reward);
            payable(treasury).transfer(task.platformFee);
            task.status = TaskStatus.COMPLETED;
        } else if (_resolution == DisputeStatus.RESOLVED_SPLIT) {
            uint256 half = totalFunds / 2;
            payable(task.publisher).transfer(half);
            payable(task.executor).transfer(half);
        }
        
        emit DisputeResolved(_disputeId, _resolution, msg.sender);
    }
    
    // ============ 管理功能 ============
    
    function setPlatformFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= MAX_FEE, "Fee too high");
        uint256 oldFee = platformFeePercent;
        platformFeePercent = _newFee;
        emit PlatformFeeUpdated(oldFee, _newFee);
    }
    
    function setTreasury(address _newTreasury) external onlyRole(ADMIN_ROLE) {
        treasury = _newTreasury;
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============ 查询函数 ============
    
    function getTask(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }
    
    function getBids(uint256 _taskId) external view returns (Bid[] memory) {
        return taskBids[_taskId];
    }
    
    function getMyPublishedTasks(address _user) external view returns (uint256[] memory) {
        return userPublishedTasks[_user];
    }
    
    function getMyExecutingTasks(address _user) external view returns (uint256[] memory) {
        return userExecutingTasks[_user];
    }
    
    function getAvailableTasks(uint256 _offset, uint256 _limit) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](_limit);
        uint256 count = 0;
        
        for (uint256 i = _offset + 1; i <= taskCounter && count < _limit; i++) {
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
    
    // ============ 升级授权 ============
    
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}
    
    receive() external payable {}
}
