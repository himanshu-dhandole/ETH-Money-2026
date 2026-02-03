// keeper.js - Nitrolite Protocol Keeper Service for Aura Vault

const { ethers } = require('ethers');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const config = require('./config');
const logger = require('./logger');
const { NitroliteClient, StateIntent, ChannelStatus, getStateHash } = require('@erc7824/nitrolite');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { polygonAmoy } = require('viem/chains');

// ============================================
// SMART CONTRACT ABIs
// ============================================

const VAULT_ABI = [
    // View functions
    "function getAllStrategies() external view returns (tuple(address strategy, uint16 allocationBps, bool active)[])",
    "function totalAssets() external view returns (uint256)",
    "function estimatedAPY() external view returns (uint256)",
    "function verifiedNitroliteOperators(address operator) external view returns (bool)",
    "function owner() external view returns (address)",

    // Write functions
    "function updateAllocations(uint256[] calldata indices, uint16[] memory allocations) public",
    "function rebalance() external",
    "function harvest() external returns (uint256)",
    "function settleRebalance(uint8 riskTier, uint256[] calldata indices, uint8[] calldata allocations) external",
    "function settleTransfer(address user, uint256 amount, bool isWithdraw) external",

    // Events
    "event AllocationsUpdated(uint256[] indices, uint16[] allocations)",
    "event Rebalanced(uint256 timestamp, uint256 totalAssets)",
    "event Harvested(uint256 yield, uint256 fee, uint256 timestamp)"
];

const STRATEGY_ABI = [
    "function totalAssets() external view returns (uint256)",
    "function estimatedAPY() external view returns (uint256)",
    "function baseAPY() external view returns (uint256)",
    "function harvest() external"
];

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
        this.lowRiskVault = new ethers.Contract(
            config.LOW_RISK_VAULT_ADDRESS,
            VAULT_ABI,
            this.wallet
        );
        this.mediumRiskVault = new ethers.Contract(
            config.MEDIUM_RISK_VAULT_ADDRESS,
            VAULT_ABI,
            this.wallet
        );
        this.highRiskVault = new ethers.Contract(
            config.HIGH_RISK_VAULT_ADDRESS,
            VAULT_ABI,
            this.wallet
        );

        // MongoDB client
        this.mongoClient = null;
        this.db = null;

        // Strategy contract cache
        this.strategyContracts = new Map();

        // Operational state
        this.isRunning = false;
        this.lastRebalanceTime = 0;
        this.lastHarvestTime = 0;
        this.rebalanceCount = 0;
        this.harvestCount = 0;

        // Client-side rate limiting (fallback for vaults without canExecute)
        this.lastExecutionTimes = {
            rebalance: 0,
            harvest: 0
        };
        this.MIN_REBALANCE_INTERVAL = 10 * 60 * 1000; // 10 minutes in ms
        this.MIN_HARVEST_INTERVAL = 60 * 60 * 1000; // 1 hour in ms

        // Nitrolite Protocol Client
        this.nitroliteClient = null;
        this.channelId = null;
        this.channelVersion = 0n;
        this.pendingSettlements = [];

        logger.info(`📡 Vault Contract: ${config.AURA_VAULT_ADDRESS}`);
        logger.info(`🤖 AI API: ${config.AI_API_URL}`);
        logger.info(`⏰ Rebalance Interval: ${config.REBALANCE_INTERVAL / 60000} minutes`);
        logger.info(`⏰ Harvest Interval: ${config.HARVEST_INTERVAL / 60000} minutes`);
    }

    // ============================================
    // MONGODB CONNECTION
    // ============================================

    async connectMongoDB() {
        try {
            logger.debug('🗄️  Connecting to MongoDB...');
            this.mongoClient = new MongoClient(config.MONGODB_URI);
            await this.mongoClient.connect();
            this.db = this.mongoClient.db(config.MONGODB_DB_NAME);
            logger.debug('✅ MongoDB connected');
        } catch (error) {
            logger.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    // ============================================
    // VERIFICATION - CHECK NITROLITE AUTHORIZATION
    // ============================================

    async verifyNitroliteAuthorization() {
        try {
            logger.debug('🔐 Verifying authorization...');
            const operatorAddress = await this.wallet.getAddress();

            // Try Nitrolite operator check on LowRiskVault (assuming it's the same for all)
            try {
                const isAuthorized = await this.lowRiskVault.verifiedNitroliteOperators(operatorAddress);

                if (!isAuthorized) {
                    logger.error(`❌ Address ${operatorAddress} is NOT authorized as Nitrolite operator on LowRiskVault`);
                    throw new Error('Nitrolite operator not authorized');
                }

                logger.info(`✅ Nitrolite operator ${operatorAddress} is authorized`);
                return true;
            } catch (nitroliteError) {
                // If check fails, try owner check
                logger.warn('⚠️  Vault does not have Nitrolite integration, checking owner...');

                try {
                    const owner = await this.lowRiskVault.owner();

                    if (owner.toLowerCase() === operatorAddress.toLowerCase()) {
                        logger.info(`✅ Keeper is vault owner ${operatorAddress}`);
                        logger.info('   Running in owner mode (no Nitrolite integration)');
                        return true;
                    } else {
                        logger.error(`❌ Address ${operatorAddress} is neither Nitrolite operator nor owner`);
                        logger.error(`   Vault owner: ${owner}`);
                        throw new Error('Not authorized - neither Nitrolite operator nor owner');
                    }
                } catch (ownerError) {
                    logger.error('❌ Failed to check vault owner:', ownerError);
                    throw ownerError;
                }
            }
        } catch (error) {
            logger.error('❌ Authorization verification failed:', error);
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
                logger.debug(`Tier ${tier} (${tierConfigs[tier].name}): ${activeStrategies.length} active strategies`);
            } catch (error) {
                logger.error(`❌ Error fetching strategies for ${tierConfigs[tier].name}:`, error);
                allStrategies.tiers[tier] = {
                    tier: tier,
                    name: tierConfigs[tier].name,
                    strategies: []
                };
            }
        }
        return allStrategies;
    }

    // ============================================
    // FETCH CURRENT APYs FROM BLOCKCHAIN
    // ============================================

    async fetchCurrentAPYs(allStrategies) {
        logger.debug('📊 Fetching current APYs from blockchain...');

        const currentAPYs = {
            byTier: {},
            byAddress: {}
        };

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
                    logger.error(`❌ Error fetching APY for strategy ${strat.address}:`, error);
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
    // FETCH HISTORICAL APYs FROM MONGODB
    // ============================================

    async fetchPreviousAPYs(allStrategies, days = config.APY_HISTORY_DAYS) {
        logger.debug(`📈 Fetching ${days}-day APY history from MongoDB...`);

        try {
            const collection = this.db.collection('strategy_performance');
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const previousAPYs = {
                byTier: {},
                byAddress: {}
            };

            for (let tier = 0; tier < 3; tier++) {
                previousAPYs.byTier[tier] = [];
                const tierData = allStrategies.tiers[tier];
                if (!tierData || !tierData.strategies) continue;

                for (const strat of tierData.strategies) {
                    const results = await collection.find({
                        strategyAddress: strat.address,
                        timestamp: { $gte: cutoffDate }
                    }).sort({ timestamp: -1 }).limit(days).toArray();

                    results.sort((a, b) => a.timestamp - b.timestamp);

                    const apys = results.map(r => r.apy);
                    const avgAPY = apys.length ? apys.reduce((sum, apy) => sum + apy, 0) / apys.length : 0;
                    const volatility = this.calculateVolatility(apys);
                    const sharpe = this.calculateSharpe(apys);

                    const strategyData = {
                        address: strat.address,
                        index: strat.index,
                        name: allStrategies.strategyMap.get(strat.address)?.name || `Strategy_${strat.index}`,
                        avg: apys,
                        volatility: volatility,
                        sharpe: sharpe,
                        dataPoints: results.length,
                        apyHistory: avgAPY
                    };

                    previousAPYs.byTier[tier].push(strategyData);
                    previousAPYs.byAddress[strat.address] = strategyData;
                }
            }

            return previousAPYs;

        } catch (error) {
            logger.error('❌ Error fetching previous APYs:', error);
            const emptyAPYs = { byTier: {}, byAddress: {} };
            for (let tier = 0; tier < 3; tier++) {
                emptyAPYs.byTier[tier] = [];
            }
            return emptyAPYs;
        }
    }

    // ============================================
    // STATISTICAL CALCULATIONS
    // ============================================

    calculateVolatility(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    calculateSharpe(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const volatility = this.calculateVolatility(values);
        return volatility > 0 ? mean / volatility : 0;
    }

    /**
     * @notice Ensures rounded integer allocations sum to exactly 100
     * @param allocations Array of floating point percentages
     * @returns Array of integers summing to 100
     */
    adjustAllocationsTo100(allocations) {
        if (!allocations || allocations.length === 0) return [];

        // Initial rounding
        const rounded = allocations.map(a => Math.round(a));
        const sum = rounded.reduce((s, a) => s + a, 0);

        if (sum === 100) return rounded;

        // Adjustment needed
        const diff = 100 - sum;

        // Find the index of the largest allocation to minimize relative impact
        let maxIdx = 0;
        for (let i = 1; i < rounded.length; i++) {
            if (rounded[i] > rounded[maxIdx]) {
                maxIdx = i;
            }
        }

        rounded[maxIdx] += diff;
        logger.debug(`⚖️  Adjusted rounded allocations from sum ${sum} to 100. Diff ${diff} applied to index ${maxIdx}`);

        return rounded;
    }

    // ============================================
    // AI ALLOCATIONS REQUEST
    // ============================================

    async getAIAllocations(currentAPYs, previousAPYs, allStrategies) {
        logger.debug('🤖 Requesting optimal allocations from AI...');

        try {
            const aiRequestData = {
                requestType: 'rebalance',
                timestamp: Date.now(),
                tiers: []
            };

            for (let tier = 0; tier < 3; tier++) {
                const tierData = allStrategies.tiers[tier];
                const currentTierAPYs = currentAPYs.byTier[tier] || [];
                const previousTierAPYs = previousAPYs.byTier[tier] || [];

                const strategies = currentTierAPYs.map((curr, idx) => {
                    const prev = previousTierAPYs.find(p => p.address === curr.address) || {};
                    return {
                        index: curr.index,
                        address: curr.address,
                        name: curr.name,
                        currentAPY: curr.apy,
                        currentAllocation: curr.allocationPct,
                        totalAssets: curr.totalAssets,
                        historical: {
                            avgAPY: Array.isArray(prev.avg)
                                ? (prev.avg.length ? prev.avg.reduce((a, b) => a + b, 0) / prev.avg.length : 0)
                                : prev.avg || 0,
                            volatility: prev.volatility || 0,
                            sharpe: prev.sharpe || 0
                        }
                    };
                });

                aiRequestData.tiers.push({
                    tier: tier,
                    name: tierData.name,
                    strategies: strategies
                });
            }

            const payload = { base_apy: aiRequestData };

            logger.debug('AI Request Payload:', JSON.stringify(payload, null, 2));

            const aiResponse = await axios.post(config.AI_API_URL, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(config.AI_API_KEY && { 'Authorization': `Bearer ${config.AI_API_KEY}` })
                },
                timeout: 60000
            });

            const allocations = aiResponse.data;

            // Removed console.log of allocations for cleaner output
            return allocations;
        } catch (error) {
            logger.error('❌ info: 🤖 Requesting optimal allocations from AI failed', error);
            throw error;
        }
    }

    // ============================================
    // UPDATE TIER ALLOCATIONS ON-CHAIN
    // ============================================

    async updateTierAllocations(tier, indices, allocations) {
        logger.info(`📝 Updating Tier ${tier} allocations on-chain...`);
        logger.debug(`   Indices: [${indices.join(', ')}]`);
        logger.debug(`   Allocations: [${allocations.join(', ')}]%`);

        if (config.ENABLE_DRY_RUN) {
            logger.warn('🔸 DRY RUN MODE: Skipping actual transaction');
            return { hash: 'DRY_RUN', blockNumber: 0, gasUsed: 0 };
        }

        try {
            const vault = this.getVaultForTier(tier);

            // Convert % to BPS
            const allocationsBps = allocations.map(a => Math.round(a * 100));

            const tx = await vault.updateAllocations(
                indices,
                allocationsBps,
                {
                    gasLimit: config.GAS_LIMIT_REBALANCE
                }
            );

            logger.info(`   🔄 TX sent: ${tx.hash}`);

            const receipt = await tx.wait();

            logger.info(`   ✅ Confirmed in block ${receipt.blockNumber}`);
            logger.info(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);

            // Update last execution time
            this.lastExecutionTimes.rebalance = Date.now();

            return receipt;

        } catch (error) {
            logger.error(`   ❌ Error updating tier ${tier} allocations:`, error);
            throw error;
        }
    }

    // ============================================
    // REBALANCE TIER ON-CHAIN
    // ============================================

    async rebalanceTier(tier) {
        logger.info(`⚖️  Rebalancing Tier ${tier}...`);

        if (config.ENABLE_DRY_RUN) {
            logger.warn('🔸 DRY RUN MODE: Skipping actual transaction');
            return { hash: 'DRY_RUN', blockNumber: 0, gasUsed: 0 };
        }

        try {
            const vault = this.getVaultForTier(tier);

            const tx = await vault.rebalance({
                gasLimit: config.GAS_LIMIT_REBALANCE
            });

            logger.info(`   🔄 TX sent: ${tx.hash}`);

            const receipt = await tx.wait();

            logger.info(`   ✅ Confirmed in block ${receipt.blockNumber}`);
            logger.info(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);

            this.rebalanceCount++;
            this.lastRebalanceTime = Date.now();

            return receipt;

        } catch (error) {
            logger.error(`   ❌ Error rebalancing tier ${tier}:`, error);
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
            // Harvest Low Risk
            logger.info('   Harvesting Low Risk Vault...');
            try {
                const tx1 = await this.lowRiskVault.harvest({ gasLimit: config.GAS_LIMIT_HARVEST });
                logger.info(`   🔄 Low Risk Harvest TX: ${tx1.hash}`);
                await tx1.wait();
            } catch (e) { logger.error(`   ❌ Failed to harvest Low Risk Vault`, e); }

            // Harvest Medium Risk
            logger.info('   Harvesting Medium Risk Vault...');
            try {
                const tx2 = await this.mediumRiskVault.harvest({ gasLimit: config.GAS_LIMIT_HARVEST });
                logger.info(`   🔄 Medium Risk Harvest TX: ${tx2.hash}`);
                await tx2.wait();
            } catch (e) { logger.error(`   ❌ Failed to harvest Medium Risk Vault`, e); }

            // Harvest High Risk
            logger.info('   Harvesting High Risk Vault...');
            try {
                const tx3 = await this.highRiskVault.harvest({ gasLimit: config.GAS_LIMIT_HARVEST });
                logger.info(`   🔄 High Risk Harvest TX: ${tx3.hash}`);
                await tx3.wait();
            } catch (e) { logger.error(`   ❌ Failed to harvest High Risk Vault`, e); }

            this.harvestCount++;
            this.lastHarvestTime = Date.now();

            return true;

        } catch (error) {
            logger.error('   ❌ Error harvesting:', error);
            throw error;
        }
    }

    // ============================================
    // UPDATE MONGODB WITH CURRENT DATA
    // ============================================

    async updateMongoDBStrategies(currentAPYs) {
        logger.debug('💾 Updating MongoDB with current strategy data...');

        try {
            const collection = this.db.collection('strategy_performance');
            const timestamp = new Date();

            const documents = [];

            for (let tier = 0; tier < 3; tier++) {
                const tierAPYs = currentAPYs.byTier[tier] || [];

                for (const strat of tierAPYs) {
                    documents.push({
                        strategyAddress: strat.address,
                        strategyName: strat.name,
                        tier: tier,
                        index: strat.index,
                        apy: strat.apy,
                        totalAssets: strat.totalAssets,
                        allocationPct: strat.allocationPct,
                        timestamp: timestamp,
                        updatedAt: timestamp
                    });
                }
            }

            if (documents.length > 0) {
                await collection.insertMany(documents);
                logger.debug(`   ✅ Inserted ${documents.length} strategy records`);
            }

        } catch (error) {
            logger.error('   ❌ Error updating MongoDB:', error);
        }
    }

    // ============================================
    // MAIN REBALANCE CYCLE
    // ============================================

    async performRebalanceCycle() {
        logger.info(`🔄 REBALANCE CYCLE STARTED [#${this.rebalanceCount + 1}]`);

        try {
            // Step 1: Fetch all strategies
            const allStrategies = await this.fetchAllStrategies();

            // Step 2: Fetch current APYs
            const currentAPYs = await this.fetchCurrentAPYs(allStrategies);

            // Step 3: Fetch historical APYs
            const previousAPYs = await this.fetchPreviousAPYs(allStrategies);

            // Step 4: Get AI allocations
            const aiAllocations = await this.getAIAllocations(currentAPYs, previousAPYs, allStrategies);

            // Step 5: Update and rebalance each tier
            for (let tier = 0; tier < aiAllocations.tiers.length; tier++) {
                const tierData = aiAllocations.tiers[tier];
                if (!tierData || !tierData.strategies || tierData.strategies.length === 0) {
                    logger.warn(`   ⚠️  No AI allocations for tier ${tier}, skipping...`);
                    continue;
                }

                logger.info(`\n━━━ TIER ${tier}: ${tierData.name.toUpperCase()} ━━━`);

                const indices = tierData.strategies.map(s => s.index);
                const rawAllocations = tierData.strategies.map(s => s.newAllocation);
                const allocations = this.adjustAllocationsTo100(rawAllocations);

                // Attempt Nitrolite off-chain submission first
                const nitroliteSubmitted = await this.submitOffChainRebalance(tier, indices, allocations);

                if (!nitroliteSubmitted) {
                    logger.info('   Falling back to standard on-chain rebalance...');
                    // Update allocations on-chain directly
                    await this.updateTierAllocations(tier, indices, allocations);
                    // Rebalance tier on-chain
                    await this.rebalanceTier(tier);
                } else {
                    logger.info('   Rebalance queued for batch settlement via Nitrolite');
                }
            }

            // Step 6: Update MongoDB
            await this.updateMongoDBStrategies(currentAPYs);

            logger.info(`✅ REBALANCE CYCLE COMPLETED [Total: ${this.rebalanceCount}]`);

        } catch (error) {
            logger.error('❌ REBALANCE CYCLE FAILED:', error);
            logger.error('Stack trace:', error.stack);
        }
    }

    // ============================================
    // MAIN HARVEST CYCLE
    // ============================================

    async performHarvestCycle() {
        logger.info(`🌾 HARVEST CYCLE STARTED [#${this.harvestCount + 1}]`);

        try {
            const receipt = await this.harvestAll();

            if (receipt) {
                logger.info(`✅ HARVEST CYCLE COMPLETED [Total: ${this.harvestCount}]`);
            }

        } catch (error) {
            logger.error('❌ HARVEST CYCLE FAILED:', error);
            logger.error('Stack trace:', error.stack);
        }
    }

    // ============================================
    // START AUTOMATION SERVICE
    // ============================================

    async start() {
        try {
            logger.info('\n🚀 Starting Nitrolite Keeper Service...\n');

            // Connect to MongoDB
            await this.connectMongoDB();

            // Verify Nitrolite authorization
            await this.verifyNitroliteAuthorization();

            // Initialize Nitrolite Protocol Channel
            await this.initNitroliteProtocol();

            this.isRunning = true;

            // Run initial rebalance
            await this.performRebalanceCycle();

            // Schedule rebalance cycles
            setInterval(() => {
                if (this.isRunning) {
                    this.performRebalanceCycle();
                }
            }, config.REBALANCE_INTERVAL);

            // Schedule harvest cycles
            setInterval(() => {
                if (this.isRunning) {
                    this.performHarvestCycle();
                }
            }, config.HARVEST_INTERVAL);

            logger.info('✅ Nitrolite Keeper Service fully operational!');
            logger.info(`⏰ Rebalancing every ${config.REBALANCE_INTERVAL / 60000} minutes`);
            logger.info(`🌾 Harvesting every ${config.HARVEST_INTERVAL / 60000} minutes\n`);

        } catch (error) {
            logger.error('❌ Failed to start Nitrolite Keeper Service:', error);
            throw error;
        }
    }

    // ============================================
    // STOP SERVICE
    // ============================================

    async stop() {
        logger.info('\n👋 Shutting down Nitrolite Keeper Service...');
        this.isRunning = false;

        if (this.mongoClient) {
            await this.mongoClient.close();
            logger.info('✅ MongoDB connection closed');
        }

        if (this.channelId && this.nitroliteClient) {
            try {
                // In a production environment, you would finalize the channel state
                // and sign a closing state with the peer.
                logger.info(`🔌 Closing Nitrolite channel: ${this.channelId}`);
                // Simplified closing for the service shutdown
            } catch (error) {
                logger.warn('⚠️ Failed to close Nitrolite channel cleanly:', error.message || error);
            }
        }

        logger.info('✅ Service stopped gracefully');
    }

    // ============================================
    // HEALTH CHECK
    // ============================================

    getStatus() {
        return {
            isRunning: this.isRunning,
            rebalanceCount: this.rebalanceCount,
            harvestCount: this.harvestCount,
            lastRebalanceTime: this.lastRebalanceTime,
            lastHarvestTime: this.lastHarvestTime,
            operatorAddress: this.wallet.address,
            vaultAddress: config.AURA_VAULT_ADDRESS
        };
    }
    // ============================================
    // NITROLITE PROTOCOL INTEGRATION (OFFICIAL SDK)
    // ============================================

    async initNitroliteProtocol() {
        try {
            logger.info('🔌 Initializing Nitrolite Protocol SDK...');

            const account = privateKeyToAccount(config.NITROLITE_OPERATOR_PRIVATE_KEY);

            // Create viem clients as required by the Nitrolite SDK
            const publicClient = createPublicClient({
                chain: polygonAmoy, // Aura-Farm targets Polygon Amoy
                transport: http(config.RPC_URL)
            });

            const walletClient = createWalletClient({
                account,
                chain: polygonAmoy,
                transport: http(config.RPC_URL)
            });

            this.nitroliteClient = new NitroliteClient({
                publicClient,
                walletClient,
                chainId: config.CHAIN_ID,
                challengeDuration: 3600n, // Minimum 1 hour
                addresses: {
                    // For Aura integration, we use the vault's settlement hooks as placeholders
                    custody: config.AURA_VAULT_ADDRESS,
                    adjudicator: config.AURA_VAULT_ADDRESS
                },
                stateSigner: {
                    sign: async (data) => account.signMessage({ message: { raw: data } })
                }
            });

            logger.info('✅ Nitrolite Protocol SDK Initialized');

            // Establish or resume channel
            try {
                const openChannels = await this.nitroliteClient.getOpenChannels();

                if (openChannels.length > 0) {
                    this.channelId = openChannels[0];
                    logger.info(`🔌 Resuming Nitrolite channel: ${this.channelId}`);
                } else {
                    logger.info('🛰️ No open channels found on-chain, using virtual channel management');
                    this.channelId = ethers.id(`aura-rebalance-channel-${config.CHAIN_ID}`);
                }
            } catch (error) {
                logger.warn('⚠️ Vault contract does not support Nitrolite channel discovery, using virtual channel management');
                this.channelId = ethers.id(`aura-rebalance-channel-${config.CHAIN_ID}`);
            }

            logger.info(`📝 Using Nitrolite Channel ID: ${this.channelId}`);

            // Start settlement timer
            this.settlementTimer = setInterval(
                () => this.performNitroliteSettlement(),
                config.SETTLEMENT_INTERVAL
            );

        } catch (error) {
            logger.error('❌ Failed to initialize Nitrolite Protocol:', error);
            // Fallback: Service continues in generic keeper mode
        }
    }

    async submitOffChainRebalance(tier, indices, allocations) {
        // Fallback: If Nitrolite client isn't ready, use standard rebalance
        if (!this.nitroliteClient) {
            return false;
        }

        try {
            logger.info(`⚡ Submitting off-chain rebalance for Tier ${tier} to Nitrolite...`);

            logger.debug(`   Indices for Tier ${tier}: [${indices.join(', ')}]`);
            logger.debug(`   Allocations for Tier ${tier}: [${allocations.join(', ')}]`);

            // Encode the rebalance data into the state data field
            const abiCoder = new ethers.AbiCoder();
            const stateData = abiCoder.encode(
                ["uint8", "uint256[]", "uint8[]"],
                [tier, indices, allocations]
            );

            // Get current version (try contract first, then local)
            let currentVersion = this.channelVersion || 0n;
            try {
                const channelData = await this.nitroliteClient.getChannelData(this.channelId);
                if (channelData && channelData.lastValidState) {
                    currentVersion = channelData.lastValidState.version;
                }
            } catch (error) {
                // Fallback to local version tracking if contract read fails
            }

            // Construct the update state
            const unsignedState = {
                intent: StateIntent.OPERATE,
                version: currentVersion + 1n,
                data: stateData,
                allocations: []
            };

            const stateHash = getStateHash(this.channelId, unsignedState);
            const signature = await this.nitroliteClient.walletClient.account.signMessage({
                message: { raw: stateHash }
            });

            const state = {
                ...unsignedState,
                sigs: [signature]
            };

            // Attempt checkpointing (Clearnode/P2P), skip if on-chain call fails
            try {
                await this.nitroliteClient.checkpointChannel({
                    channelId: this.channelId,
                    candidateState: state
                });
            } catch (error) {
                // In hybrid mode, missing on-chain checkpoint is OK as we settle via custom hook
                logger.debug('ℹ️ Nitrolite on-chain checkpoint skipped (unsupported by vault contract)');
            }

            // Update local version tracking
            this.channelVersion = state.version;

            // Queue for batch settlement
            this.pendingSettlements.push(state);

            logger.info(`✅ Off-chain state signed for Tier ${tier} [Version: ${state.version}]`);
            return true;
        } catch (error) {
            logger.warn('⚠️ Nitrolite off-chain signing failed:', error.message || error);
            return false;
        }
    }

    async performNitroliteSettlement() {
        logger.debug(`🕒 Nitrolite settlement check... Pending: ${this.pendingSettlements.length}`);

        if (this.pendingSettlements.length === 0) return;

        logger.info(`📦 Batch settling ${this.pendingSettlements.length} Nitrolite operations on-chain...`);

        const states = [...this.pendingSettlements];
        this.pendingSettlements = [];

        for (const state of states) {
            let tier;
            try {
                logger.debug(`🔍 Decoding state data for Version: ${state.version}. Data length: ${state.data.length}`);

                // Decode the state data
                const abiCoder = new ethers.AbiCoder();
                const [decodedTier, decodedIndices, decodedAllocations] = abiCoder.decode(
                    ["uint8", "uint256[]", "uint8[]"],
                    state.data
                );
                tier = Number(decodedTier);
                const indices = Array.from(decodedIndices);
                const allocations = Array.from(decodedAllocations);

                logger.info(`⚖️ Settling rebalance from Nitrolite state for Tier ${tier} [Version: ${state.version}]...`);

                const vault = this.getVaultForTier(tier);

                const tx = await vault.settleRebalance(
                    tier,
                    indices,
                    allocations,
                    { gasLimit: config.GAS_LIMIT_REBALANCE }
                );

                logger.info(`   🔄 Settlement TX for Tier ${tier}: ${tx.hash}`);
                const receipt = await tx.wait();
                logger.info(`✅ Tier ${tier} settlement confirmed in block ${receipt.blockNumber}`);

                this.rebalanceCount++;
                this.lastRebalanceTime = Date.now();
            } catch (error) {
                logger.error(`❌ Settlement failed for Tier ${tier !== undefined ? tier : 'unknown'}:`);
                logger.error(error);
                if (error.data) logger.error(`   Error Data: ${error.data}`);
                if (error.transaction) logger.error(`   Failed TX: ${JSON.stringify(error.transaction)}`);

                // In a production app, you might want to retry or handle this differently
                this.pendingSettlements.push(state);
            }
        }
    }
}

// ============================================
// START THE SERVICE
// ============================================

async function main() {
    const keeper = new NitroliteKeeperService();

    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
        await keeper.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await keeper.stop();
        process.exit(0);
    });

    // Start the service
    await keeper.start();
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        logger.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = NitroliteKeeperService;
