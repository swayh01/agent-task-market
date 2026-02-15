const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await deployer.provider.getBalance(deployer.address)).toString());
  
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };
  
  try {
    // 1. Deploy ReputationSystem
    console.log('\n1. Deploying ReputationSystem...');
    const ReputationSystem = await ethers.getContractFactory('ReputationSystem');
    const reputation = await upgrades.deployProxy(
      ReputationSystem,
      [deployer.address],
      { kind: 'uups' }
    );
    await reputation.waitForDeployment();
    deploymentInfo.contracts.reputation = await reputation.getAddress();
    console.log('ReputationSystem deployed to:', deploymentInfo.contracts.reputation);
    
    // 2. Deploy ATMToken
    console.log('\n2. Deploying ATMToken...');
    const ATMToken = await ethers.getContractFactory('ATMToken');
    const atmToken = await upgrades.deployProxy(
      ATMToken,
      ['Agent Task Market Token', 'ATM', deployer.address],
      { kind: 'uups' }
    );
    await atmToken.waitForDeployment();
    deploymentInfo.contracts.atmToken = await atmToken.getAddress();
    console.log('ATMToken deployed to:', deploymentInfo.contracts.atmToken);
    
    // 3. Deploy AgentTaskMarket
    console.log('\n3. Deploying AgentTaskMarket...');
    const AgentTaskMarket = await ethers.getContractFactory('AgentTaskMarket');
    const taskMarket = await upgrades.deployProxy(
      AgentTaskMarket,
      [deployer.address, deployer.address], // admin and treasury
      { kind: 'uups' }
    );
    await taskMarket.waitForDeployment();
    deploymentInfo.contracts.taskMarket = await taskMarket.getAddress();
    console.log('AgentTaskMarket deployed to:', deploymentInfo.contracts.taskMarket);
    
    // 4. Setup connections
    console.log('\n4. Setting up contract connections...');
    
    // Set task market in reputation system
    await (await reputation.setTaskMarket(deploymentInfo.contracts.taskMarket)).wait();
    console.log('✓ TaskMarket set in ReputationSystem');
    
    // Grant roles
    await (await taskMarket.grantRole(await taskMarket.ARBITER_ROLE(), deployer.address)).wait();
    console.log('✓ Arbiter role granted to deployer');
    
    // 5. Get implementation addresses
    console.log('\n5. Getting implementation addresses...');
    const reputationImpl = await upgrades.erc1967.getImplementationAddress(deploymentInfo.contracts.reputation);
    const atmTokenImpl = await upgrades.erc1967.getImplementationAddress(deploymentInfo.contracts.atmToken);
    const taskMarketImpl = await upgrades.erc1967.getImplementationAddress(deploymentInfo.contracts.taskMarket);
    
    deploymentInfo.implementations = {
      reputation: reputationImpl,
      atmToken: atmTokenImpl,
      taskMarket: taskMarketImpl
    };
    
    // 6. Save deployment info
    const deploymentPath = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }
    
    const filename = `deployment-${hre.network.name}-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(deploymentPath, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Also save as latest
    fs.writeFileSync(
      path.join(deploymentPath, `latest-${hre.network.name}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('\n✅ Deployment completed successfully!');
    console.log('\nDeployment info saved to:', path.join(deploymentPath, filename));
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('           DEPLOYMENT SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log('Network:', hre.network.name);
    console.log('');
    console.log('Proxy Contracts:');
    console.log('  ReputationSystem:', deploymentInfo.contracts.reputation);
    console.log('  ATMToken:', deploymentInfo.contracts.atmToken);
    console.log('  AgentTaskMarket:', deploymentInfo.contracts.taskMarket);
    console.log('');
    console.log('Implementation Contracts:');
    console.log('  ReputationSystem:', reputationImpl);
    console.log('  ATMToken:', atmTokenImpl);
    console.log('  AgentTaskMarket:', taskMarketImpl);
    console.log('═══════════════════════════════════════════════');
    
    // Print verification commands
    if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
      console.log('\nVerification Commands:');
      console.log(`npx hardhat verify --network ${hre.network.name} ${reputationImpl}`);
      console.log(`npx hardhat verify --network ${hre.network.name} ${atmTokenImpl}`);
      console.log(`npx hardhat verify --network ${hre.network.name} ${taskMarketImpl}`);
    }
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
