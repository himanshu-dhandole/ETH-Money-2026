// api.js - Express API Server for User-Initiated Rebalancing
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const config = require('./config');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// User rebalance queue (in-memory for now, can be moved to DB later)
const userRebalanceQueue = [];

// ============================================
// SIGNATURE VERIFICATION
// ============================================

/**
 * Verify that the user signed the rebalance request
 * @param {string} userAddress - User's wallet address
 * @param {number} vaultId - Vault ID (0=Low, 1=Medium, 2=High)
 * @param {string} signature - User's signature
 * @returns {boolean} - True if signature is valid
 */
function verifyRebalanceSignature(userAddress, vaultId, signature) {
    try {
        // Create the message that should have been signed
        const message = `Rebalance request for vault ${vaultId} at ${userAddress}`;

        // Recover the signer from the signature
        const recoveredAddress = ethers.verifyMessage(message, signature);

        // Check if recovered address matches the user address
        return recoveredAddress.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
        logger.error('❌ Signature verification failed:', error);
        return false;
    }
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * POST /api/user/rebalance
 * User requests to rebalance their position
 */
app.post('/api/user/rebalance', async (req, res) => {
    try {

        console.log('Rebalance request received:', req.body);
        const { userAddress, vaultId, signature } = req.body;

        // Validation
        if (!userAddress || vaultId === undefined || !signature) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userAddress, vaultId, signature'
            });
        }

        // Validate vaultId
        if (![0, 1, 2].includes(Number(vaultId))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid vaultId. Must be 0 (Low Risk), 1 (Medium Risk), or 2 (High Risk)'
            });
        }

        // Verify signature
        const isValid = verifyRebalanceSignature(userAddress, vaultId, signature);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Check if user already has a pending request
        const existingRequest = userRebalanceQueue.find(
            r => r.user.toLowerCase() === userAddress.toLowerCase() && r.vaultId === Number(vaultId)
        );

        if (existingRequest) {
            return res.status(409).json({
                success: false,
                error: 'You already have a pending rebalance request for this vault',
                position: userRebalanceQueue.indexOf(existingRequest) + 1,
                estimatedSettlement: 'within 1 hour'
            });
        }

        // Add to queue
        userRebalanceQueue.push({
            user: userAddress,
            vaultId: Number(vaultId),
            timestamp: Date.now(),
            signature: signature
        });

        logger.info(`✅ Rebalance request queued for ${userAddress} (Vault ${vaultId})`);

        res.json({
            success: true,
            message: 'Rebalance request queued successfully',
            position: userRebalanceQueue.length,
            queueSize: userRebalanceQueue.length,
            estimatedSettlement: 'within 1 hour'
        });

    } catch (error) {
        logger.error('❌ Error processing rebalance request:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/user/rebalance/status/:address
 * Check status of user's rebalance request
 */
app.get('/api/user/rebalance/status/:address', (req, res) => {
    try {
        const { address } = req.params;
        const userRequests = userRebalanceQueue.filter(
            r => r.user.toLowerCase() === address.toLowerCase()
        );

        if (userRequests.length === 0) {
            return res.json({
                success: true,
                hasPendingRequests: false,
                requests: []
            });
        }

        const requestsWithPosition = userRequests.map(r => ({
            vaultId: r.vaultId,
            timestamp: r.timestamp,
            position: userRebalanceQueue.indexOf(r) + 1,
            estimatedSettlement: 'within 1 hour'
        }));

        res.json({
            success: true,
            hasPendingRequests: true,
            requests: requestsWithPosition,
            totalQueueSize: userRebalanceQueue.length
        });

    } catch (error) {
        logger.error('❌ Error checking rebalance status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/queue/stats
 * Get queue statistics (admin endpoint)
 */
app.get('/api/queue/stats', (req, res) => {
    try {
        const stats = {
            totalRequests: userRebalanceQueue.length,
            byVault: {
                lowRisk: userRebalanceQueue.filter(r => r.vaultId === 0).length,
                mediumRisk: userRebalanceQueue.filter(r => r.vaultId === 1).length,
                highRisk: userRebalanceQueue.filter(r => r.vaultId === 2).length
            },
            oldestRequest: userRebalanceQueue.length > 0
                ? new Date(userRebalanceQueue[0].timestamp).toISOString()
                : null
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('❌ Error getting queue stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queueSize: userRebalanceQueue.length
    });
});

// ============================================
// EXPORT QUEUE AND SERVER
// ============================================

function startAPIServer() {
    app.listen(PORT, () => {
        logger.info(`🌐 API Server running on port ${PORT}`);
        logger.info(`📡 Endpoints:`);
        logger.info(`   POST /api/user/rebalance - Request rebalance`);
        logger.info(`   GET  /api/user/rebalance/status/:address - Check status`);
        logger.info(`   GET  /api/queue/stats - Queue statistics`);
        logger.info(`   GET  /health - Health check`);
    });
}

module.exports = {
    startAPIServer,
    userRebalanceQueue,
    app
};
