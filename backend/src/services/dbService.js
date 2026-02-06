// dbService.js - MongoDB Data Service
const { MongoClient } = require('mongodb');
const config = require('../config');
const logger = require('../logger');
const { calculateVolatility, calculateSharpe } = require('../utils/stats');

class DatabaseService {
    constructor() {
        this.mongoClient = null;
        this.db = null;
    }

    async connect() {
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

    async close() {
        if (this.mongoClient) {
            await this.mongoClient.close();
            logger.info('✅ MongoDB connection closed');
        }
    }

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
                    const volatility = calculateVolatility(apys);
                    const sharpe = calculateSharpe(apys);

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

    async updateStrategies(currentAPYs) {
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
}

module.exports = new DatabaseService();
