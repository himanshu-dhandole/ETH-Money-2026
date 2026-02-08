# 🌟 Aura Protocol - HackMoney2026

> **Personalized DeFi Yield Aggregation with streamlined UX , AI based: optimizations, allocations, healthchecks **

Aura Farm revolutionizes DeFi by making sophisticated yield strategies accessible to everyone through personalized risk profiles and intelligent automation. Built on Arc testnet with Nitrolite Protocol integration for gas-efficient settlements.

**A UX-first personalized DeFi protocol** powered by soulbound NFTs that encode your unique risk tolerance, enabling truly customized yield strategies without compromising on security or capital efficiency.

---

## 🎯 The Problem

Traditional DeFi yield aggregators suffer from critical flaws, as painfully demonstrated by the Luna crash and similar failures:

1. **One-Size-Fits-All Approach** - Everyone gets the same strategy regardless of risk tolerance
2. **Random Liquidations** - Unexpected market events cause cascading failures and total loss
3. **Manual Rebalancing** - Users must constantly monitor and adjust positions manually
4. **Gas-Intensive Operations** - Every rebalance costs significant gas fees

**Result:** Catastrophic losses (as seen in LUNA 2022 crash), suboptimal returns, poor user experience, and barriers to entry for non-technical users.

---

## 💡 The Solution

Aura Protocol introduces **Personalized DeFi**:

### 🎨 Soulbound Risk Profiles
Users mint a **non-transferable NFT** that defines their unique risk tolerance:
- **Conservative** (Low Risk) - Stable, predictable yields
- **Balanced** (Medium Risk) - Growth with controlled volatility  
- **Aggressive** (High Risk) - Maximum returns, higher variance

### 🤖 AI-Powered Allocation Engine
Our intelligent backend continuously:
- Monitors APY performance across 9+ strategies
- **AI-Powered Health Checks** - Validates strategies via APY monitoring and total asset drop detection
- **AI Intelligence System** - Validates strategy safety and performance using EIP-712 signed attestations
- Analyzes historical volatility and Sharpe ratios
- Dynamically rebalances allocations to optimize risk-adjusted returns
- Executes via **Nitrolite Protocol** for gas-efficient off-chain settlements
- **Cross-Chain USDC Deposits** - Accept deposits from any chain via Circle CCTP bridge

### ⚡ Gas-Efficient Architecture
- **Nitrolite Integration** - Off-chain state management with on-chain settlement
- **Batch Operations** - Process multiple user rebalances in single transactions
- **Yield Reserve System** - Realistic yield simulation without minting tokens

### 🌉 Circle CCTP Gateway Integration
- **Seamless Cross-Chain Deposits** - Built on Arc testnet (Arbitrum Orbit L3) with native Circle CCTP support
- **Any-Chain USDC Acceptance** - Users can deposit USDC from Ethereum, Base, Optimism, Arbitrum, or any CCTP-enabled chain
- **Native USDC Experience** - No wrapped tokens or bridges - true USDC everywhere via Circle's Cross-Chain Transfer Protocol
- **UX Improvement**: Users don't need Arc testnet gas tokens or manual bridging - deposit directly from their preferred chain
- **Instant Liquidity** - CCTP burns on source chain and mints natively on Arc, ensuring canonical USDC at all times

---

## 🏗️ Architecture

![Architecture Diagram](https://cdn.phototourl.com/uploads/2026-02-07-82aba36e-9d8c-4908-9000-6204f2bee0bc.png)

---

## 🚀 Key Features

### 1️⃣ Personalized Risk Management
```solidity
// Mint your unique risk profile NFT
riskNFT.mint(
    lowPct: 40,    // 40% in low-risk strategies
    medPct: 40,    // 40% in medium-risk strategies  
    highPct: 20    // 20% in high-risk strategies
);
```

### 2️⃣ Automated Rebalancing
- **User-Initiated**: Request rebalance anytime via API
- **Keeper-Driven**: Automated rebalancing every 10 minutes
- **Harvest-on-Rebalance**: Auto-collects yield during position updates

### 3️⃣ Nitrolite Integration
Off-chain state management with cryptographic settlement for rebalancing:
```javascript
// Off-chain: Sign allocation update
const signature = await signer.signTypedData({
    domain, types, message: {
        riskTier: 0,
        indices: [0, 1, 2],
        allocations: [33, 33, 34],
        nonce: currentNonce
    }
});

// On-chain: Settle when profitable
await vault.settleRebalance(riskTier, indices, allocations, nonce, signature);
```

### 4️⃣ Realistic Yield Simulation
- **YieldReserve Contract** - Pre-funded with real Arc USDC
- **No Token Minting** - Strategies draw from reserve (for testing)
- **Transparent Metrics** - Track efficiency and distribution

### 5️⃣ AI-Powered Allocations
- **Dynamic Strategy Weighting** - AI analyzes historical performance data
- **Volatility-Adjusted Returns** - Optimize for risk-adjusted yield via Sharpe ratios
- **Adaptive Rebalancing** - Frequency adjusts based on market conditions
- **Health Monitoring** - Automatic alerts on strategy underperformance

---

## 📊 User Experience

### Onboarding Flow
```
1. Connect Wallet (Any Chain!)
   ↓
2. Complete Risk Assessment Quiz
   ↓
3. Mint Soulbound Risk NFT
   ↓
4. Deposit USDC (via Circle CCTP from Ethereum, Base, Optimism, etc.)
   ↓
5. Auto-allocation to Vaults
   ↓
6. Earn Optimized Yield
```

### 🎯 UX Improvements via Circle CCTP
- **No Manual Bridging** - Deposit directly from your preferred chain
- **No Wrapped Tokens** - Always native, canonical USDC
- **No Arc Gas Required** - CCTP handles cross-chain transfer
- **Instant Settlement** - Burn & mint mechanism ensures fast finality
- **Familiar Experience** - Use the same USDC you already hold

### Dashboard Features
- **Real-time P&L Tracking** - See current value vs. cost basis
- **APY Breakdown** - Understand returns by risk tier
- **Strategy Performance** - Detailed metrics per strategy
- **One-Click Rebalancing** - Update allocations anytime
- **Partial Withdrawals** - Withdraw any percentage

---

## 📁 Project Structure

```
aura-protocol/
├── contracts/              # Solidity smart contracts
│   ├── src/
│   │   ├── vaults/        # ERC4626 vaults (3 tiers)
│   │   ├── strategies/    # Yield strategies (9 total)
│   │   ├── RiskNFT.sol    # Soulbound profile NFT
│   │   ├── VaultRouter.sol # User-facing entry point
│   │   └── YieldReserve.sol # Yield distribution
│   └── script/            # Deployment scripts
│
├── backend/               # Automation backend
│   ├── src/
│   │   ├── keeper.js      # Main orchestrator
│   │   ├── api.js         # User rebalance API
│   │   └── services/      # Nitrolite, DB, AI
│   └── abis/              # Contract ABIs
│
└── ai-models/             # AI allocation engine
    └── app/
        ├── graph.py       # LangChain agent
        └── main.py        # FastAPI server
```

---

## 🎮 Getting Started

### Prerequisites
```bash
# System requirements
Node.js >= 18.0
Python >= 3.10
Foundry
MongoDB
```

### 1. Deploy Contracts

```bash
cd contracts

# Set environment variables
cp .env.example .env
# Edit .env with your private key

# Deploy YieldReserve (one-time)
forge script script/DeployYieldReserve.s.sol:DeployYieldReserve \
    --broadcast --rpc-url $RPC_URL

# Deploy main contracts
forge script script/Deploy.s.sol:Deploy \
    --broadcast --rpc-url $RPC_URL
```

**Key Addresses (Arc Testnet):**
- Native USDC: `0x3600000000000000000000000000000000000000`
- YieldReserve: (save after deployment)
- VaultRouter: (save after deployment)

**Circle CCTP Integration:**
- Get testnet USDC from [Circle Faucet](https://faucet.circle.com)
- Bridge from any chain using [Circle CCTP](https://www.circle.com/en/cross-chain-transfer-protocol)
- Arc testnet automatically receives native USDC - no wrapped tokens!

### 2. Start AI Engine

```bash
cd ai-models

# Install dependencies
pip install -r requirements.txt

# Set Groq API key
cp .env.example .env
echo 'GROQ_API_KEY="your-key-here"' >> .env

# Start server
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Start Backend Keeper

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add contract addresses from deployment

# Start MongoDB
mongod --dbpath ./data

# Run keeper
npm start
```

### 4. Authorize Keeper

```bash
cd contracts

# Authorize backend as Nitrolite operator
forge script script/AddOperator.s.sol:AddOperator \
    --broadcast --rpc-url $RPC_URL
```

---

## 🔄 How It Works

### Deposit Flow (with Circle CCTP)
1. User initiates deposit from **any CCTP-enabled chain** (Ethereum, Base, Optimism, Arbitrum, etc.)
2. Circle CCTP burns USDC on source chain and mints native USDC on Arc testnet
3. VaultRouter reads user's Risk NFT: `40/40/20` allocation
4. Automatically distributes:
   - 400 USDC → Low Risk Vault
   - 400 USDC → Medium Risk Vault
   - 200 USDC → High Risk Vault
5. Each vault allocates to 3 strategies per allocation BPS

**UX Win**: User never needs to manually bridge or acquire Arc gas tokens!

### Rebalancing Flow
1. **AI Analysis** (every 10 min):
   - Fetch current APYs from all 9 strategies
   - Calculate 7-day volatility and Sharpe ratios
   - Generate optimal allocations per tier

2. **Nitrolite Settlement**:
   - Sign allocation update off-chain (EIP-712)
   - Queue for batch settlement
   - Settle on-chain when profitable

3. **Vault Execution**:
   - Withdraw from all strategies
   - **Harvest yields first** (critical!)
   - Reallocate per new allocations
   - Emit rebalance event

### User-Initiated Rebalancing
```bash
# User requests rebalance via API
curl -X POST http://localhost:3001/api/user/rebalance \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x...",
    "vaultId": 1,
    "signature": "0x..."
  }'

# Keeper processes hourly in batches
await vault.batchRebalanceUsers([user1, user2, ...]);
```

---

## 🎯 Why This Matters

### For Users
✅ **Personalization** - Your risk, your returns  
✅ **Automation** - Set and forget  
✅ **Transparency** - See exactly where your funds go  
✅ **Flexibility** - Update profile anytime  

### For DeFi
✅ **Onboarding** - Lower barrier to entry  
✅ **Retention** - Better UX keeps users engaged  
✅ **Capital Efficiency** - Smart rebalancing maximizes TVL utilization  
✅ **Innovation** - Proves personalization is possible on-chain  

### For Developers
✅ **Composability** - ERC4626 vaults integrate anywhere  
✅ **Extensibility** - Easy to add new strategies  
✅ **Best Practices** - Production-ready code patterns  
✅ **Open Source** - Learn and build on top  

---
## 📜 Deployed Contracts (ARC Testnet)

All core Aura Protocol smart contracts are **live and fully deployed** on the **ARC Testnet**.  
Reviewers can verify every transaction directly via the ARC Explorer.

### 🔐 Core Protocol Contracts
- **Risk NFT (Soulbound Profile)**  
  `0x062AE9bF265b7a0FF8be70Bd89B282d2a600B656`

- **Strategy Factory**  
  `0x858ffd59974237faBD10EC52F9c43B217dc1cCfc`

- **Yield Reserve**  
  `0xF3c6C6Ee7014466E5980E77FFFF34f94eaC00b58`

- **Vault Router (Main Entry Point)**  
  `0x93F7c33f1C93210CCCf3b69289EE813571114b47`

### 🏦 ERC4626 Vaults (Risk Tiers)
- **Low Risk Vault**  
  `0x160317Db387Fa31a45480dA76B6FD5Bf5Ef4e65f`

- **Medium Risk Vault**  
  `0x7380f32390AEeBB288C944d593A97C1Fde831C1A`

- **High Risk Vault**  
  `0x502B124a5bE0F6Afcca70D9De446E1E3E3842F7E`

### 🔍 ARC Explorer
👉 https://explorer.arc.network

---

All contracts are deployed on **ARC Testnet**.  
Reviewers can paste any address above into the explorer to verify transactions, contract code, vault interactions, Nitrolite settlements, and Circle CCTP cross-chain USDC flows.

<div align="center">

*Making DeFi Personal, One NFT at a Time*

</div>
