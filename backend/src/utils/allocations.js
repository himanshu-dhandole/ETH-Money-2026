// allocations.js - Allocation management utilities
const logger = require('../logger');

/**
 * @notice Ensures rounded integer allocations sum to exactly 100
 * @param allocations Array of floating point percentages
 * @returns Array of integers summing to 100
 */
function adjustAllocationsTo100(allocations) {
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

module.exports = {
    adjustAllocationsTo100
};
