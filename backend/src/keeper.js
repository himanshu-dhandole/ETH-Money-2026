// keeper.js - Nitrolite Protocol Keeper Service for Aura Vault

const { ethers } = require('ethers');
const config = require('./config');
const logger = require('./logger');

// Helper Services & Utils
const dbService = require('./services/dbService');
const nitroliteService = require('./services/nitroliteService');
const { getAIAllocations } = require('./services/aiService');
const { adjustAllocationsTo100 } = require('./utils/allocations');
const VAULT_ABI = require('./abis/vault.json');
const ROUTER_ABI = require('./abis/router.json');
const STRATEGY_ABI = require('./abis/strategy.json');
const RISKNFT_ABI = require('./abis/riskNft.json');

// API Server for user-initiated rebalances
const { startAPIServer, userRebalanceQueue } = require('./api');

// ============================================
// NITROLITE KEEPER SERVICE CLASS
// ============================================

class NitroliteKeeperService {
    constructor() {
        logger.info('🚀 Initializing Nitrolite Keeper Service for Aura Vault');

        // Initialize provider and wallet
        this.provider = new ethers.JsonRpcProvider(config.RPC_URL);
        this.wallet = new ethers.Wallet(config.NITROLITE_OPERATOR_PRIVATE_KEY, this.provider);

        // Initialize vault contracts for each risk tier
        this.lowRiskVault = new ethers.Contract(config.LOW_RISK_VAULT_ADDRESS, VAULT_ABI, this.wallet);
        this.mediumRiskVault = new ethers.Contract(config.MEDIUM_RISK_VAULT_ADDRESS, VAULT_ABI, this.wallet);
        this.highRiskVault = new ethers.Contract(config.HIGH_RISK_VAULT_ADDRESS, VAULT_ABI, this.wallet);

        // Initialize Router
        this.vaultRouter = new ethers.Contract(config.AURA_VAULT_ADDRESS, ROUTER_ABI, this.wallet);

        // Initialize RiskNFT
        this.riskNFT = new ethers.Contract(config.RISK_NFT_ADDRESS, RISKNFT_ABI, this.wallet);

        // Strategy contract cache
        this.strategyContracts = new Map();

        // Operational state
        this.isRunning = false;
        this.lastRebalanceTime = 0;
        this.lastHarvestTime = 0;
        this.lastUserRebalanceTime = 0; // NEW: Track user rebalance timing
        this.rebalanceCount = 0;
        this.harvestCount = 0;
        this.userRebalanceCount = 0; // NEW: Track user rebalances

        // Client-side rate limiting
        this.lastExecutionTimes = {
            rebalance: 0,
            harvest: 0,
            userRebalance: 0 // NEW
        };

        logger.info(`📡 Vault Contract: ${config.AURA_VAULT_ADDRESS}`);
        logger.info(`⏰ Rebalance Interval: ${config.REBALANCE_INTERVAL / 60000} minutes`);
        logger.info(`⏰ Harvest Interval: ${config.HARVEST_INTERVAL / 60000} minutes`);
        logger.info(`⏰ User Rebalance Interval: 1 minute`); // NEW
    }

    // ============================================
    // VERIFICATION - CHECK NITROLITE AUTHORIZATION
    // ============================================

    async verifyNitroliteAuthorization() {
        try {
            logger.debug('🔐 Verifying authorization...');
            const operatorAddress = await this.wallet.getAddress();

            try {
                const isAuthorized = await this.lowRiskVault.verifiedNitroliteOperators(operatorAddress);
                if (!isAuthorized) {
                    throw new Error('Nitrolite operator not authorized');
                }
                logger.info(` Nitrolite operator ${operatorAddress} is authorized`);
                return true;
            } catch (nitroliteError) {
                logger.warn('⚠️  Vault does not have Nitrolite integration, checking owner...');
                const owner = await this.lowRiskVault.owner();
                if (owner.toLowerCase() === operatorAddress.toLowerCase()) {
                    logger.info(` Keeper is vault owner ${operatorAddress}`);
                    return true;
                } else {
                    throw new Error('Not authorized - neither Nitrolite operator nor owner');
                }
            }
        } catch (error) {
            logger.error(' Authorization verification failed:', error);
            throw error;
        }
    }

    // ============================================
    // STRATEGY CONTRACT HELPER
    // ============================================

    getStrategyContract(strategyAddress) {
        if (!this.strategyContracts.has(strategyAddress)) {
            this.strategyContracts.set(
                strategyAddress,
                new ethers.Contract(strategyAddress, STRATEGY_ABI, this.wallet)
            );
        }
        return this.strategyContracts.get(strategyAddress);
    }

    getVaultForTier(tier) {
        switch (Number(tier)) {
            case 0: return this.lowRiskVault;
            case 1: return this.mediumRiskVault;
            case 2: return this.highRiskVault;
            default: throw new Error(`Invalid tier: ${tier}`);
        }
    }

    // ============================================
    // FETCH ALL STRATEGIES FROM BLOCKCHAIN
    // ============================================

    async fetchAllStrategies() {
        logger.debug('🔍 Fetching all strategies from each vault...');

        const allStrategies = {
            tiers: [],
            strategyMap: new Map()
        };

        const tierConfigs = [
            { name: 'Low Risk', contract: this.lowRiskVault },
            { name: 'Medium Risk', contract: this.mediumRiskVault },
            { name: 'High Risk', contract: this.highRiskVault }
        ];

        for (let tier = 0; tier < 3; tier++) {
            const vault = tierConfigs[tier].contract;
            try {
                const strategies = await vault.getAllStrategies();
                const activeStrategies = [];
                let strategyIndex = 0;

                for (let i = 0; i < strategies.length; i++) {
                    const s = strategies[i];
                    if (s.active) {
                        activeStrategies.push({
                            index: i,
                            address: s.strategy,
                            allocationPct: Number(s.allocationBps) / 100, // Convert BPS to %
                            active: s.active
                        });
                        allStrategies.strategyMap.set(s.strategy, {
                            name: `${tierConfigs[tier].name}_Strategy_${strategyIndex}`,
                            tier: tier,
                            contractIndex: i
                        });
                        strategyIndex++;
                    }
                }

                allStrategies.tiers[tier] = {
                    tier: tier,
                    name: tierConfigs[tier].name,
                    strategyCount: activeStrategies.length,
                    strategies: activeStrategies
                };
            } catch (error) {
                logger.error(` Error fetching strategies for ${tierConfigs[tier].name}:`, error);
                allStrategies.tiers[tier] = { tier, name: tierConfigs[tier].name, strategies: [] };
            }
        }
        return allStrategies;
    }

    // ============================================
    // FETCH CURRENT APYs FROM BLOCKCHAIN
    // ============================================

    async fetchCurrentAPYs(allStrategies) {
        logger.debug('📊 Fetching current APYs from blockchain...');
        const currentAPYs = { byTier: {}, byAddress: {} };

        for (let tier = 0; tier < 3; tier++) {
            currentAPYs.byTier[tier] = [];
            const tierData = allStrategies.tiers[tier];
            if (!tierData || !tierData.strategies) continue;

            for (const strat of tierData.strategies) {
                try {
                    const strategyContract = this.getStrategyContract(strat.address);
                    const [baseApyRaw, totalAssets] = await Promise.all([
                        strategyContract.baseAPY(),
                        strategyContract.totalAssets()
                    ]);

                    const baseApyPercent = Number(baseApyRaw) / 100;
                    const assetsFormatted = Number(ethers.formatUnits(totalAssets, 18));

                    const strategyData = {
                        address: strat.address,
                        index: strat.index,
                        allocationPct: strat.allocationPct,
                        apy: baseApyPercent,
                        totalAssets: assetsFormatted,
                        name: allStrategies.strategyMap.get(strat.address)?.name || `Strategy_${strat.index}`
                    };

                    currentAPYs.byTier[tier].push(strategyData);
                    currentAPYs.byAddress[strat.address] = strategyData;

                } catch (error) {
                    logger.error(` Error fetching APY for strategy ${strat.address}:`, error);
                    currentAPYs.byTier[tier].push({
                        address: strat.address,
                        index: strat.index,
                        allocationPct: strat.allocationPct,
                        apy: 0,
                        totalAssets: 0,
                        name: `Strategy_${strat.index}`
                    });
                }
            }
        }
        return currentAPYs;
    }

    // ============================================
    // UPDATE TIER ALLOCATIONS ON-CHAIN
    // ============================================

    async updateTierAllocations(tier, indices, allocations) {
        logger.info(`📝 Updating Tier ${tier} allocations on-chain...`);
        if (config.ENABLE_DRY_RUN) {
            logger.warn('🔸 DRY RUN MODE: Skipping actual transaction');
            return { hash: 'DRY_RUN', blockNumber: 0, gasUsed: 0 };
        }

        try {
            const vault = this.getVaultForTier(tier);
            const allocationsBps = allocations.map(a => Math.round(a * 100));

            const tx = await vault.updateAllocations(indices, allocationsBps, {
                gasLimit: config.GAS_LIMIT_REBALANCE
            });
            logger.info(`   🔄 TX sent: ${tx.hash}`);
            const receipt = await tx.wait();
            logger.info(`    Confirmed in block ${receipt.blockNumber}`);
            this.lastExecutionTimes.rebalance = Date.now();
            return receipt;
        } catch (error) {
            logger.error(`    Error updating tier ${tier} allocations:`, error);
            throw error;
        }
    }

    // ============================================
    // REBALANCE TIER ON-CHAIN
    // ============================================

    async rebalanceTier(tier) {
        logger.info(`  Rebalancing Tier ${tier}...`);
        if (config.ENABLE_DRY_RUN) {
            logger.warn('🔸 DRY RUN MODE: Skipping actual transaction');
            return { hash: 'DRY_RUN', blockNumber: 0, gasUsed: 0 };
        }

        try {
            const vault = this.getVaultForTier(tier);
            const tx = await vault.rebalance({ gasLimit: config.GAS_LIMIT_REBALANCE });
            logger.info(`   🔄 TX sent: ${tx.hash}`);
            const receipt = await tx.wait();
            logger.info(`    Confirmed in block ${receipt.blockNumber}`);
            this.rebalanceCount++;
            this.lastRebalanceTime = Date.now();
            return receipt;
        } catch (error) {
            logger.error(`    Error rebalancing tier ${tier}:`, error);
            throw error;
        }
    }

    // ============================================
    // HARVEST ALL STRATEGIES
    // ============================================

    async harvestAll() {
        logger.info('🌾 Harvesting all strategies across all vaults...');
        if (config.ENABLE_DRY_RUN) {
            logger.warn('🔸 DRY RUN MODE: Skipping actual transaction');
            return { hash: 'DRY_RUN', blockNumber: 0, gasUsed: 0 };
        }

        try {
            const vaults = [
                { name: 'Low Risk', contract: this.lowRiskVault },
                { name: 'Medium Risk', contract: this.mediumRiskVault },
                { name: 'High Risk', contract: this.highRiskVault }
            ];

            for (const { name, contract } of vaults) {
                logger.info(`   Harvesting ${name} Vault...`);
                try {
                    const tx = await contract.harvest({ gasLimit: config.GAS_LIMIT_HARVEST });
                    logger.info(`   🔄 ${name} Harvest TX: ${tx.hash}`);
                    await tx.wait();
                } catch (e) {
                    logger.error(`    Failed to harvest ${name} Vault`, e);
                }
            }
            this.harvestCount++;
            this.lastHarvestTime = Date.now();
            return true;
        } catch (error) {
            logger.error('    Error harvesting:', error);
            throw error;
        }
    }

    // ============================================
    // MAIN REBALANCE CYCLE
    // ============================================

    async performRebalanceCycle() {
        logger.info(`🔄 REBALANCE CYCLE STARTED [#${this.rebalanceCount + 1}]`);

        try {
            const allStrategies = await this.fetchAllStrategies();
            const currentAPYs = await this.fetchCurrentAPYs(allStrategies);
            const previousAPYs = await dbService.fetchPreviousAPYs(allStrategies);
            const aiAllocations = await getAIAllocations(currentAPYs, previousAPYs, allStrategies);

            for (let tier = 0; tier < aiAllocations.tiers.length; tier++) {
                const tierData = aiAllocations.tiers[tier];
                if (!tierData || !tierData.strategies || tierData.strategies.length === 0) continue;

                logger.info(`\n━━━ TIER ${tier}: ${tierData.name.toUpperCase()} ━━━`);
                const indices = tierData.strategies.map(s => s.index);
                const rawAllocations = tierData.strategies.map(s => s.newAllocation);
                const allocations = adjustAllocationsTo100(rawAllocations);

                const nitroliteSubmitted = await nitroliteService.submitOffChainRebalance(tier, indices, allocations);

                if (!nitroliteSubmitted) {
                    logger.info('   Falling back to standard on-chain rebalance...');
                    await this.updateTierAllocations(tier, indices, allocations);
                    await this.rebalanceTier(tier);
                } else {
                    logger.info('Off-Chain Executed');
                }
            }

            await dbService.updateStrategies(currentAPYs);
            logger.info(` REBALANCE CYCLE COMPLETED [Total: ${this.rebalanceCount}]`);

        } catch (error) {
            logger.error(' REBALANCE CYCLE FAILED:', error);
        }
    }

    // ============================================
    // NITROLITE SETTLEMENT
    // ============================================

    async performNitroliteSettlement(pendingSettlements) {
        if (!pendingSettlements || pendingSettlements.length === 0) return;
        logger.info(` Batch settling ${pendingSettlements.length} Nitrolite operations on-chain...`);

        // Get states from service and clear them immediately
        const states = [...pendingSettlements];
        nitroliteService.clearSettlements();

        for (const state of states) {
            if (state.type === 'USER_BUNDLE') {
                try {
                    logger.info(` Settling user rebalance bundle from Nitrolite for ${state.users.length} users [Nonce: ${state.nonce}]...`);

                    const tx = await this.wallet.sendTransaction({
                        to: config.AURA_VAULT_ADDRESS,
                        data: this.vaultRouter.interface.encodeFunctionData("settleUserBatchRebalance", [
                            state.users,
                            state.nonce,
                            state.signature
                        ]),
                        gasLimit: 200000n + (350000n * BigInt(state.users.length))
                    });

                    logger.info(`On-Chain Executed: ${tx.hash}`);
                    await tx.wait();
                    this.userRebalanceCount += state.users.length;
                } catch (error) {
                    logger.error(' User bundle settlement failed:', error);
                }
                continue;
            }

            let tier;
            try {
                const { tier: decodedTier, indices, allocations } = nitroliteService.decodeStateData(state.data);
                tier = decodedTier;

                logger.info(` Settling rebalance from Nitrolite state for Tier ${tier} [Version: ${state.version}]...`);
                const vault = this.getVaultForTier(tier);

                const tx = await vault.settleRebalance(
                    tier,
                    indices,
                    allocations,
                    state.nonce,
                    state.eip712Signature,
                    {
                        gasLimit: config.GAS_LIMIT_REBALANCE
                    }
                );

                logger.info(`On-Chain Executed: ${tx.hash}`);
                const receipt = await tx.wait();

                this.rebalanceCount++;
                this.lastRebalanceTime = Date.now();
            } catch (error) {
                logger.error(` Settlement failed for Tier ${tier !== undefined ? tier : 'unknown'}:`, error);
                // Note: In robust prod system, re-queue this state if transient error
            }
        }
    }

    // ============================================
    // USER-INITIATED REBALANCE CYCLE
    // ============================================

    async performUserRebalanceCycle() {
        if (userRebalanceQueue.length === 0) {
            logger.debug('📭 No user rebalance requests in queue');
            return;
        }

        logger.info(`👥 USER REBALANCE CYCLE STARTED [Queue: ${userRebalanceQueue.length} requests]`);

        try {
            // Get unique users to rebalance
            const uniqueUsers = [...new Set(userRebalanceQueue.map(req => req.user))];

            if (uniqueUsers.length === 0) return;

            // Perform checks on each user
            const validUsers = [];
            for (const user of uniqueUsers) {
                try {
                    // Check 1: Has Profile?
                    const hasProfile = await this.riskNFT.hasProfile(user);
                    if (!hasProfile) {
                        logger.warn(`Skipping user ${user}: No Risk Profile NFT`);
                        continue;
                    }

                    // Check 2: Has Position?
                    // Returns: lowShares, medShares, highShares, ..., totalDeposited, ...
                    const position = await this.vaultRouter.getUserPosition(user);
                    const totalShares = BigInt(position[0]) + BigInt(position[1]) + BigInt(position[2]);

                    if (totalShares === 0n) {
                        logger.warn(`Skipping user ${user}: No Vault Shares (Position is empty)`);
                        continue;
                    }



                    validUsers.push(user);
                } catch (checkErr) {
                    logger.error(`Error verifying user ${user}:`, checkErr);
                }
            }

            if (validUsers.length === 0) {
                logger.info('   No valid users to rebalance after checks.');
                return;
            };

            logger.info(`   Signing rebalance bundle for ${validUsers.length} valid unique user(s) via Nitrolite...`);

            try {
                // Instead of on-chain execution, we sign off-chain
                const success = await nitroliteService.submitUserBundleRebalance(validUsers);

                if (success) {
                    // Clear the processed users from global queue
                    uniqueUsers.forEach(user => {
                        const index = userRebalanceQueue.findIndex(req => req.user === user);
                        if (index !== -1) userRebalanceQueue.splice(index, 1);
                    });
                    logger.info('   ✅ Bundle signed and queued for next settlement');
                } else {
                    // logger.warn('   ⚠️ Nitrolite signing failed, requests remain in queue');
                }

            } catch (txError) {
                logger.error(`   ❌ Error submitting Nitrolite bundle: ${txError.message}`);
            }

            this.lastUserRebalanceTime = Date.now();
            this.lastExecutionTimes.userRebalance = Date.now();

            logger.info(`✅ USER REBALANCE CYCLE COMPLETED [Total requests: ${uniqueUsers.length}]`);
            logger.info(`📊 Total user rebalances processed: ${this.userRebalanceCount}`);

        } catch (error) {
            logger.error('❌ USER REBALANCE CYCLE FAILED:', error);
        }
    }

    // ============================================
    // MAIN EXECUTION
    // ============================================

    async start() {
        try {
            logger.info('\n🚀 Starting Nitrolite Keeper Service...\n');

            await dbService.connect();
            await this.verifyNitroliteAuthorization();

            // Initialize Nitrolite Service with callback for settlement
            await nitroliteService.init((pending) => this.performNitroliteSettlement(pending));

            // Start API server for user-initiated rebalances
            startAPIServer();

            this.isRunning = true;

            // Initial rebalance cycle
            await this.performRebalanceCycle();

            // Set up intervals
            setInterval(() => {
                if (this.isRunning) this.performRebalanceCycle();
            }, config.REBALANCE_INTERVAL);

            setInterval(() => {
                if (this.isRunning) this.performHarvestCycle();
            }, config.HARVEST_INTERVAL);

            // NEW: User rebalance cycle every 1 minute
            setInterval(() => {
                if (this.isRunning) this.performUserRebalanceCycle();
            }, 60 * 1000); // 1 minute

            logger.info('✅ Nitrolite Keeper Service fully operational!');
            logger.info('📡 API Server ready for user rebalance requests');

        } catch (error) {
            logger.error('❌ Failed to start Nitrolite Keeper Service:', error);
            throw error;
        }
    }

    async stop() {
        logger.info('\n👋 Shutting down Nitrolite Keeper Service...');
        this.isRunning = false;
        await dbService.close();
        const channelId = nitroliteService.close();
        if (channelId) logger.info(`🔌 Closing Nitrolite channel: ${channelId}`);
        logger.info(' Service stopped gracefully');
    }

    // Added performHarvestCycle missing in draft above
    async performHarvestCycle() {
        logger.info(`🌾 HARVEST CYCLE STARTED [#${this.harvestCount + 1}]`);
        try {
            const receipt = await this.harvestAll();
            if (receipt) logger.info(` HARVEST CYCLE COMPLETED [Total: ${this.harvestCount}]`);
        } catch (error) {
            logger.error(' HARVEST CYCLE FAILED:', error);
        }
    }
}

// Start Script
async function main() {
    const keeper = new NitroliteKeeperService();
    process.on('SIGINT', async () => { await keeper.stop(); process.exit(0); });
    process.on('SIGTERM', async () => { await keeper.stop(); process.exit(0); });
    await keeper.start();
}

if (require.main === module) {
    main().catch(error => { logger.error(' Fatal error:', error); process.exit(1); });
}

module.exports = NitroliteKeeperService;
