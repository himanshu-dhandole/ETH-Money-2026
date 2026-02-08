// config.js - Nitrolite Service Configuration

require('dotenv').config();

module.exports = {
    // Blockchain Configuration
    RPC_URL: process.env.RPC_URL || 'https://arb1.arbitrum.io/rpc',
    CHAIN_ID: process.env.CHAIN_ID || 42161,

    // Contract Addresses
    AURA_VAULT_ADDRESS: process.env.AURA_VAULT_ADDRESS,
    LOW_RISK_VAULT_ADDRESS: process.env.LOW_RISK_VAULT_ADDRESS,
    MEDIUM_RISK_VAULT_ADDRESS: process.env.MEDIUM_RISK_VAULT_ADDRESS,
    HIGH_RISK_VAULT_ADDRESS: process.env.HIGH_RISK_VAULT_ADDRESS,
    VIRTUAL_USDT_ADDRESS: process.env.VIRTUAL_USDT_ADDRESS,
    RISK_NFT_ADDRESS: process.env.RISK_NFT_ADDRESS,

    // Nitrolite Operator Configuration
    NITROLITE_OPERATOR_PRIVATE_KEY: process.env.NITROLITE_OPERATOR_PRIVATE_KEY,

    // AI API Configuration
    AI_API_URL: process.env.AI_API_URL || '',
    AI_API_KEY: process.env.AI_API_KEY || '',

    // MongoDB Configuration
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'aura_farm',

    // Automation Intervals
    REBALANCE_INTERVAL: parseInt(process.env.REBALANCE_INTERVAL || '600000'), // 10 minutes in ms
    HARVEST_INTERVAL: parseInt(process.env.HARVEST_INTERVAL || '3600000'), // 1 hour in ms
    DATA_REFRESH_INTERVAL: parseInt(process.env.DATA_REFRESH_INTERVAL || '20000'), // 20 seconds

    // APY History Configuration
    APY_HISTORY_DAYS: parseInt(process.env.APY_HISTORY_DAYS || '7'),

    // Gas Configuration
    MAX_GAS_PRICE: process.env.MAX_GAS_PRICE || '100', // in gwei
    GAS_LIMIT_REBALANCE: process.env.GAS_LIMIT_REBALANCE || '3000000',
    GAS_LIMIT_HARVEST: process.env.GAS_LIMIT_HARVEST || '5000000',

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Safety Features
    ENABLE_DRY_RUN: process.env.ENABLE_DRY_RUN === 'true',
    REQUIRE_CONFIRMATION: process.env.REQUIRE_CONFIRMATION === 'true',

    // Nitrolite Protocol Configuration (Official SDK)
    NITROLITE_CLEARNODE: process.env.NITROLITE_CLEARNODE || 'wss://clearnet.yellow.com/ws',
    SETTLEMENT_INTERVAL: parseInt(process.env.SETTLEMENT_INTERVAL || '300000'), // 5 minutes

    // Monitoring
    ENABLE_HEALTH_CHECK: process.env.ENABLE_health_check !== 'false',
    HEALTH_CHECK_PORT: parseInt(process.env.HEALTH_CHECK_PORT || '3000'),
};
