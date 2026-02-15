// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ReputationSystem
 * @dev Agent 声誉管理系统
 */
contract ReputationSystem is AccessControlUpgradeable, UUPSUpgradeable {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TASK_MARKET_ROLE = keccak256("TASK_MARKET_ROLE");
    
    struct AgentReputation {
        uint256 score;
        uint256 totalTasksCompleted;
        uint256 totalTasksPublished;
        uint256 totalEarned;
        uint256 totalSpent;
        uint256 positiveRatings;
        uint256 negativeRatings;
        uint256 disputeWins;
        uint256 disputeLosses;
        uint256 joinedAt;
        uint256 lastActiveAt;
    }
    
    struct Skill {
        string name;
        uint256 score;
        uint256 tasksCompleted;
        uint256 totalRating;
    }
    
    struct Rating {
        uint256 id;
        uint256 taskId;
        address rater;
        address ratee;
        uint8[5] scores;
        string commentCID;
        uint256 createdAt;
    }
    
    mapping(address => AgentReputation) public reputations;
    mapping(address => mapping(string => Skill)) public skills;
    mapping(address => string[]) public agentSkillList;
    mapping(uint256 => Rating) public ratings;
    uint256 public ratingCounter;
    
    address public taskMarket;
    
    uint256 public constant BASE_SCORE = 50;
    uint256 public constant MAX_SCORE = 100;
    
    event ReputationUpdated(
        address indexed agent,
        uint256 newScore,
        uint256 change
    );
    
    event SkillUpdated(
        address indexed agent,
        string skillName,
        uint256 newScore
    );
    
    event RatingSubmitted(
        uint256 indexed ratingId,
        uint256 indexed taskId,
        address indexed ratee,
        uint8 overallScore
    );
    
    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }
    
    function setTaskMarket(address _taskMarket) external onlyRole(ADMIN_ROLE) {
        taskMarket = _taskMarket;
        _grantRole(TASK_MARKET_ROLE, _taskMarket);
    }
    
    function recordCompletion(
        address _agent,
        uint8 _rating,
        uint8 _taskType
    ) external onlyRole(TASK_MARKET_ROLE) {
        AgentReputation storage rep = reputations[_agent];
        
        if (rep.joinedAt == 0) {
            rep.joinedAt = block.timestamp;
            rep.score = BASE_SCORE;
        }
        
        rep.totalTasksCompleted++;
        rep.lastActiveAt = block.timestamp;
        
        if (_rating >= 4) {
            rep.positiveRatings++;
            rep.score = _min(rep.score + 2, MAX_SCORE);
        } else if (_rating >= 3) {
            rep.score = _min(rep.score + 1, MAX_SCORE);
        } else if (_rating == 2) {
            rep.negativeRatings++;
            rep.score = _max(rep.score - 3, 0);
        } else {
            rep.negativeRatings++;
            rep.score = _max(rep.score - 5, 0);
        }
        
        emit ReputationUpdated(_agent, rep.score, _rating >= 4 ? 2 : _rating == 3 ? 1 : _rating == 2 ? -3 : -5);
    }
    
    function recordDisputeLoss(address _agent) external onlyRole(TASK_MARKET_ROLE) {
        AgentReputation storage rep = reputations[_agent];
        rep.disputeLosses++;
        rep.score = _max(rep.score - 10, 0);
        
        emit ReputationUpdated(_agent, rep.score, -10);
    }
    
    function recordDisputeWin(address _agent) external onlyRole(TASK_MARKET_ROLE) {
        AgentReputation storage rep = reputations[_agent];
        rep.disputeWins++;
        rep.score = _min(rep.score + 5, MAX_SCORE);
        
        emit ReputationUpdated(_agent, rep.score, 5);
    }
    
    function recordEarning(address _agent, uint256 _amount) external onlyRole(TASK_MARKET_ROLE) {
        AgentReputation storage rep = reputations[_agent];
        rep.totalEarned += _amount;
        rep.lastActiveAt = block.timestamp;
    }
    
    function recordSpending(address _agent, uint256 _amount) external onlyRole(TASK_MARKET_ROLE) {
        AgentReputation storage rep = reputations[_agent];
        rep.totalSpent += _amount;
        rep.lastActiveAt = block.timestamp;
    }
    
    function updateSkill(
        address _agent,
        string calldata _skillName,
        uint8 _rating,
        bool _isCompletion
    ) external onlyRole(TASK_MARKET_ROLE) {
        Skill storage skill = skills[_agent][_skillName];
        
        if (bytes(skill.name).length == 0) {
            skill.name = _skillName;
            agentSkillList[_agent].push(_skillName);
        }
        
        if (_isCompletion) {
            skill.tasksCompleted++;
            skill.totalRating += _rating;
            skill.score = (skill.totalRating * 20) / skill.tasksCompleted;
        }
        
        emit SkillUpdated(_agent, _skillName, skill.score);
    }
    
    function submitRating(
        uint256 _taskId,
        address _rater,
        address _ratee,
        uint8[5] calldata _scores,
        string calldata _commentCID
    ) external onlyRole(TASK_MARKET_ROLE) returns (uint256) {
        ratingCounter++;
        
        Rating storage rating = ratings[ratingCounter];
        rating.id = ratingCounter;
        rating.taskId = _taskId;
        rating.rater = _rater;
        rating.ratee = _ratee;
        rating.scores = _scores;
        rating.commentCID = _commentCID;
        rating.createdAt = block.timestamp;
        
        emit RatingSubmitted(ratingCounter, _taskId, _ratee, _scores[0]);
        
        return ratingCounter;
    }
    
    function getReputation(address _agent) external view returns (AgentReputation memory) {
        return reputations[_agent];
    }
    
    function getSkill(address _agent, string calldata _skillName) external view returns (Skill memory) {
        return skills[_agent][_skillName];
    }
    
    function getAgentSkills(address _agent) external view returns (string[] memory) {
        return agentSkillList[_agent];
    }
    
    function getLevel(address _agent) external view returns (uint8) {
        uint256 score = reputations[_agent].score;
        
        if (score >= 91) return 4;
        if (score >= 71) return 3;
        if (score >= 51) return 2;
        if (score >= 31) return 1;
        return 0;
    }
    
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    function _max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}
}
