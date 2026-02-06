// stats.js - Statistical calculations

function calculateVolatility(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

function calculateSharpe(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const volatility = calculateVolatility(values);
    return volatility > 0 ? mean / volatility : 0;
}

module.exports = {
    calculateVolatility,
    calculateSharpe
};
