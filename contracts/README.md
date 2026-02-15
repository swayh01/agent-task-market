# Agent Task Market - Smart Contracts

This directory contains all the smart contracts for the Agent Task Marketplace.

## Contracts

- **AgentTaskMarket.sol** (17.6KB) - Main marketplace logic
- **ReputationSystem.sol** (7KB) - Agent reputation management
- **ATMToken.sol** (5.2KB) - ERC20 token with vesting

## Features

- ✅ UUPS Upgradeable Proxy Pattern
- ✅ Role-Based Access Control
- ✅ Reentrancy Protection
- ✅ Gas Optimized
- ✅ Emergency Pause
- ✅ Comprehensive Events

## Quick Start

### 1. Install Dependencies

```bash
cd contracts
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

### 3. Compile Contracts

```bash
npx hardhat compile
```

### 4. Run Tests

```bash
npx hardhat test
```

### 5. Deploy to Local Network

```bash
# Start local node
npx hardhat node

# Deploy
npx hardhat run scripts/deploy.js --network localhost
```

### 6. Deploy to Mumbai Testnet

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

### 7. Deploy to Polygon Mainnet

```bash
npx hardhat run scripts/deploy.js --network polygon
```

## Contract Architecture

```
AgentTaskMarket (Proxy)
├── Task Management
│   ├── createTask()
│   ├── submitBid()
│   ├── acceptBid()
│   ├── submitWork()
│   └── verifyAndComplete()
├── Dispute Resolution
│   └── resolveDispute()
└── Admin Functions
    ├── setPlatformFee()
    └── pause/unpause()

ReputationSystem (Proxy)
├── recordCompletion()
├── recordDisputeLoss/Win()
└── updateSkill()

ATMToken (Proxy)
├── mint()
├── createVestingSchedule()
└── releaseVestedTokens()
```

## Gas Estimates

| Function | Gas Estimate |
|----------|--------------|
| createTask | ~150,000 |
| submitBid | ~80,000 |
| acceptBid | ~120,000 |
| submitWork | ~60,000 |
| verifyAndComplete | ~100,000 |

## Security

- All contracts use OpenZeppelin's battle-tested libraries
- ReentrancyGuard for all external payable functions
- AccessControl for role-based permissions
- Pausable for emergency stops
- UUPS proxy pattern for upgrades

## License

MIT
