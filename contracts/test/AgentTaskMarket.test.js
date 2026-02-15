const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('AgentTaskMarket', function () {
  let agentTaskMarket;
  let reputationSystem;
  let atmToken;
  let owner, publisher, executor, arbiter, treasury;
  
  const TASK_TITLE = 'Test Task';
  const TASK_DESCRIPTION_CID = 'QmTestDescription';
  const TASK_REQUIREMENTS_CID = 'QmTestRequirements';
  const REWARD = ethers.parseEther('1.0');
  const DEADLINE = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
  
  beforeEach(async function () {
    [owner, publisher, executor, arbiter, treasury] = await ethers.getSigners();
    
    // Deploy ReputationSystem
    const ReputationSystem = await ethers.getContractFactory('ReputationSystem');
    reputationSystem = await upgrades.deployProxy(ReputationSystem, [owner.address]);
    await reputationSystem.waitForDeployment();
    
    // Deploy ATMToken
    const ATMToken = await ethers.getContractFactory('ATMToken');
    atmToken = await upgrades.deployProxy(ATMToken, ['ATM Token', 'ATM', owner.address]);
    await atmToken.waitForDeployment();
    
    // Deploy AgentTaskMarket
    const AgentTaskMarket = await ethers.getContractFactory('AgentTaskMarket');
    agentTaskMarket = await upgrades.deployProxy(AgentTaskMarket, [
      owner.address,
      treasury.address
    ]);
    await agentTaskMarket.waitForDeployment();
    
    // Setup roles
    await agentTaskMarket.grantRole(await agentTaskMarket.ARBITER_ROLE(), arbiter.address);
    await reputationSystem.setTaskMarket(await agentTaskMarket.getAddress());
  });
  
  describe('Task Creation', function () {
    it('Should create a task successfully', async function () {
      const tx = await agentTaskMarket.connect(publisher).createTask(
        TASK_TITLE,
        TASK_DESCRIPTION_CID,
        TASK_REQUIREMENTS_CID,
        1, // COMPUTE
        DEADLINE,
        false, // no bidding
        0, // min reputation
        { value: REWARD }
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return agentTaskMarket.interface.parseLog(log).name === 'TaskCreated';
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      
      const task = await agentTaskMarket.getTask(1);
      expect(task.title).to.equal(TASK_TITLE);
      expect(task.publisher).to.equal(publisher.address);
      expect(task.status).to.equal(1); // PUBLISHED
    });
    
    it('Should fail to create task with empty title', async function () {
      await expect(
        agentTaskMarket.connect(publisher).createTask(
          '',
          TASK_DESCRIPTION_CID,
          TASK_REQUIREMENTS_CID,
          1,
          DEADLINE,
          false,
          0,
          { value: REWARD }
        )
      ).to.be.revertedWith('Title required');
    });
    
    it('Should fail to create task with no reward', async function () {
      await expect(
        agentTaskMarket.connect(publisher).createTask(
          TASK_TITLE,
          TASK_DESCRIPTION_CID,
          TASK_REQUIREMENTS_CID,
          1,
          DEADLINE,
          false,
          0,
          { value: 0 }
        )
      ).to.be.revertedWith('Reward required');
    });
    
    it('Should fail to create task with past deadline', async function () {
      await expect(
        agentTaskMarket.connect(publisher).createTask(
          TASK_TITLE,
          TASK_DESCRIPTION_CID,
          TASK_REQUIREMENTS_CID,
          1,
          Math.floor(Date.now() / 1000) - 1000,
          false,
          0,
          { value: REWARD }
        )
      ).to.be.revertedWith('Deadline must be future');
    });
  });
  
  describe('Task Acceptance', function () {
    beforeEach(async function () {
      await agentTaskMarket.connect(publisher).createTask(
        TASK_TITLE,
        TASK_DESCRIPTION_CID,
        TASK_REQUIREMENTS_CID,
        1,
        DEADLINE,
        false,
        0,
        { value: REWARD }
      );
    });
    
    it('Should allow executor to accept task', async function () {
      await agentTaskMarket.connect(executor).acceptTask(1);
      
      const task = await agentTaskMarket.getTask(1);
      expect(task.executor).to.equal(executor.address);
      expect(task.status).to.equal(4); // IN_PROGRESS
    });
    
    it('Should fail if publisher tries to accept own task', async function () {
      await expect(
        agentTaskMarket.connect(publisher).acceptTask(1)
      ).to.be.revertedWith('Cannot accept own');
    });
    
    it('Should fail if task is already assigned', async function () {
      await agentTaskMarket.connect(executor).acceptTask(1);
      
      await expect(
        agentTaskMarket.connect(executor).acceptTask(1)
      ).to.be.reverted;
    });
  });
  
  describe('Work Submission', function () {
    const RESULT_CID = 'QmTestResult';
    
    beforeEach(async function () {
      await agentTaskMarket.connect(publisher).createTask(
        TASK_TITLE,
        TASK_DESCRIPTION_CID,
        TASK_REQUIREMENTS_CID,
        1,
        DEADLINE,
        false,
        0,
        { value: REWARD }
      );
      await agentTaskMarket.connect(executor).acceptTask(1);
    });
    
    it('Should allow executor to submit work', async function () {
      await agentTaskMarket.connect(executor).submitWork(1, RESULT_CID);
      
      const task = await agentTaskMarket.getTask(1);
      expect(task.resultCID).to.equal(RESULT_CID);
      expect(task.status).to.equal(5); // SUBMITTED
    });
    
    it('Should fail if non-executor tries to submit', async function () {
      await expect(
        agentTaskMarket.connect(publisher).submitWork(1, RESULT_CID)
      ).to.be.revertedWith('Not executor');
    });
    
    it('Should fail with empty result CID', async function () {
      await expect(
        agentTaskMarket.connect(executor).submitWork(1, '')
      ).to.be.revertedWith('Result required');
    });
  });
  
  describe('Task Verification and Payment', function () {
    const RESULT_CID = 'QmTestResult';
    
    beforeEach(async function () {
      await agentTaskMarket.connect(publisher).createTask(
        TASK_TITLE,
        TASK_DESCRIPTION_CID,
        TASK_REQUIREMENTS_CID,
        1,
        DEADLINE,
        false,
        0,
        { value: REWARD }
      );
      await agentTaskMarket.connect(executor).acceptTask(1);
      await agentTaskMarket.connect(executor).submitWork(1, RESULT_CID);
    });
    
    it('Should complete task and pay executor', async function () {
      const executorBalanceBefore = await ethers.provider.getBalance(executor.address);
      
      await agentTaskMarket.connect(publisher).verifyAndComplete(1, true);
      
      const task = await agentTaskMarket.getTask(1);
      expect(task.status).to.equal(6); // COMPLETED
      
      const executorBalanceAfter = await ethers.provider.getBalance(executor.address);
      expect(executorBalanceAfter - executorBalanceBefore).to.be.closeTo(
        ethers.parseEther('0.98'), // 1 - 2% fee
        ethers.parseEther('0.001')
      );
    });
    
    it('Should send fee to treasury', async function () {
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);
      
      await agentTaskMarket.connect(publisher).verifyAndComplete(1, true);
      
      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(
        ethers.parseEther('0.02') // 2% fee
      );
    });
    
    it('Should create dispute if rejected', async function () {
      await agentTaskMarket.connect(publisher).verifyAndComplete(1, false);
      
      const task = await agentTaskMarket.getTask(1);
      expect(task.status).to.equal(9); // DISPUTED
    });
  });
  
  describe('Bidding', function () {
    beforeEach(async function () {
      await agentTaskMarket.connect(publisher).createTask(
        TASK_TITLE,
        TASK_DESCRIPTION_CID,
        TASK_REQUIREMENTS_CID,
        1,
        DEADLINE,
        true, // allow bidding
        0,
        { value: REWARD }
      );
    });
    
    it('Should allow bidding on task', async function () {
      const proposedReward = ethers.parseEther('0.8');
      
      await agentTaskMarket.connect(executor).submitBid(
        1,
        proposedReward,
        86400,
        'QmPitch'
      );
      
      const bids = await agentTaskMarket.getBids(1);
      expect(bids.length).to.equal(1);
      expect(bids[0].proposedReward).to.equal(proposedReward);
    });
    
    it('Should allow publisher to accept bid', async function () {
      const proposedReward = ethers.parseEther('0.8');
      
      await agentTaskMarket.connect(executor).submitBid(
        1,
        proposedReward,
        86400,
        'QmPitch'
      );
      
      await agentTaskMarket.connect(publisher).acceptBid(1, 0);
      
      const task = await agentTaskMarket.getTask(1);
      expect(task.executor).to.equal(executor.address);
      expect(task.reward).to.equal(proposedReward);
    });
  });
  
  describe('Task Cancellation', function () {
    beforeEach(async function () {
      await agentTaskMarket.connect(publisher).createTask(
        TASK_TITLE,
        TASK_DESCRIPTION_CID,
        TASK_REQUIREMENTS_CID,
        1,
        DEADLINE,
        false,
        0,
        { value: REWARD }
      );
    });
    
    it('Should allow publisher to cancel task', async function () {
      const publisherBalanceBefore = await ethers.provider.getBalance(publisher.address);
      
      await agentTaskMarket.connect(publisher).cancelTask(1);
      
      const task = await agentTaskMarket.getTask(1);
      expect(task.status).to.equal(8); // CANCELLED
      
      // Publisher should get refund
      const publisherBalanceAfter = await ethers.provider.getBalance(publisher.address);
      expect(publisherBalanceAfter).to.be.gt(publisherBalanceBefore);
    });
  });
  
  describe('Admin Functions', function () {
    it('Should allow admin to set platform fee', async function () {
      const newFee = 300; // 3%
      await agentTaskMarket.connect(owner).setPlatformFee(newFee);
      
      expect(await agentTaskMarket.platformFeePercent()).to.equal(newFee);
    });
    
    it('Should fail if non-admin tries to set fee', async function () {
      await expect(
        agentTaskMarket.connect(publisher).setPlatformFee(300)
      ).to.be.reverted;
    });
    
    it('Should allow admin to pause contract', async function () {
      await agentTaskMarket.connect(owner).pause();
      
      await expect(
        agentTaskMarket.connect(publisher).createTask(
          TASK_TITLE,
          TASK_DESCRIPTION_CID,
          TASK_REQUIREMENTS_CID,
          1,
          DEADLINE,
          false,
          0,
          { value: REWARD }
        )
      ).to.be.revertedWith('Pausable: paused');
    });
  });
});
