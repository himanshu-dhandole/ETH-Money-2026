// aiService.js - AI Interaction Service
const axios = require('axios');
const config = require('../config');
const logger = require('../logger');

async function getAIAllocations(currentAPYs, previousAPYs, allStrategies) {
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
        return allocations;
    } catch (error) {
        logger.error('❌ info: 🤖 Requesting optimal allocations from AI failed', error);
        throw error;
    }
}

module.exports = {
    getAIAllocations
};
