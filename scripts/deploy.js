const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log('部署合约...');
  console.log('部署者地址:', deployer.address);
  console.log('余额:', (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 部署主合约
  const TaskMarket = await hre.ethers.getContractFactory('AgentTaskMarket');
  const taskMarket = await TaskMarket.deploy();
  
  await taskMarket.waitForDeployment();
  
  const address = await taskMarket.getAddress();
  console.log('\n✅ TaskMarket 合约已部署');
  console.log('合约地址:', address);
  console.log('网络:', hre.network.name);

  // 保存部署信息
  const fs = require('fs');
  const deployInfo = {
    contract: 'AgentTaskMarket',
    address: address,
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    'deploy-info.json',
    JSON.stringify(deployInfo, null, 2)
  );
  
  console.log('\n部署信息已保存到 deploy-info.json');
  
  // 如果是测试网或主网，等待确认并验证
  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    console.log('\n等待区块确认...');
    await taskMarket.deploymentTransaction().wait(5);
    
    console.log('合约已确认，可以在浏览器查看:');
    if (hre.network.name === 'polygon') {
      console.log(`https://polygonscan.com/address/${address}`);
    } else if (hre.network.name === 'mumbai') {
      console.log(`https://mumbai.polygonscan.com/address/${address}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
