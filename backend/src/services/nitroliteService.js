// nitroliteService.js - Nitrolite Protocol Integration Service
const { ethers } = require('ethers');
const config = require('../config');
const logger = require('../logger');
const { NitroliteClient, StateIntent, getStateHash } = require('@erc7824/nitrolite');
const { createPublicClient, createWalletClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const vaultABI = require('../abis/vault.json');

const arcTestnet = defineChain({
    id: 5042002,
    name: 'Arc Testnet',
    network: 'arc-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: [config.RPC_URL] },
        public: { http: [config.RPC_URL] },
    },
});

class NitroliteService {
    constructor() {
        this.nitroliteClient = null;
        this.channelId = null;
        this.channelVersion = 0n;
        this.pendingSettlements = [];
        this.settlementTimer = null;
    }

    async init(settlementCallback) {
        try {
            logger.info('🔌 Initializing Nitrolite Protocol SDK...');

            const account = privateKeyToAccount(config.NITROLITE_OPERATOR_PRIVATE_KEY);

            // Create viem clients as required by the Nitrolite SDK
            const publicClient = createPublicClient({
                chain: arcTestnet,
                transport: http(config.RPC_URL)
            });

            const walletClient = createWalletClient({
                account,
                chain: arcTestnet,
                transport: http(config.RPC_URL)
            });

            this.nitroliteClient = new NitroliteClient({
                publicClient,
                walletClient,
                chainId: config.CHAIN_ID,
                challengeDuration: 3600n,
                addresses: {
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

            // Start settlement timer if callback provided
            if (settlementCallback) {
                this.settlementTimer = setInterval(
                    () => settlementCallback(this.pendingSettlements),
                    config.SETTLEMENT_INTERVAL
                );
            }

            return true;
        } catch (error) {
            logger.error('❌ Failed to initialize Nitrolite Protocol:', error);
            return false;
        }
    }

    async submitOffChainRebalance(tier, indices, allocations) {
        if (!this.nitroliteClient) return false;

        try {
            logger.info(`⚡ Submitting off-chain rebalance for Tier ${tier} to Nitrolite...`);

            // Determine Vault Address for EIP-712 Domain
            let vaultAddress;
            if (tier === 0) vaultAddress = config.LOW_RISK_VAULT_ADDRESS;
            else if (tier === 1) vaultAddress = config.MEDIUM_RISK_VAULT_ADDRESS;
            else if (tier === 2) vaultAddress = config.HIGH_RISK_VAULT_ADDRESS;

            const account = this.nitroliteClient.walletClient.account;

            // Fetch current nonce, accounting for pending settlements for this vault
            const pendingForVault = this.pendingSettlements.filter(s =>
                s.vaultAddress && s.vaultAddress.toLowerCase() === vaultAddress.toLowerCase()
            ).length;

            const contractNonce = await this.nitroliteClient.publicClient.readContract({
                address: vaultAddress,
                abi: vaultABI,
                functionName: 'nonces',
                args: [account.address]
            });
            const nonce = contractNonce + BigInt(pendingForVault);

            // EIP-712 Signing
            const domain = {
                name: "AuraVault",
                version: "1",
                chainId: Number(config.CHAIN_ID),
                verifyingContract: vaultAddress
            };
            const types = {
                Rebalance: [
                    { name: "riskTier", type: "uint8" },
                    { name: "indices", type: "uint256[]" },
                    { name: "allocations", type: "uint8[]" },
                    { name: "nonce", type: "uint256" }
                ]
            };

            const eip712Signature = await this.nitroliteClient.walletClient.signTypedData({
                account,
                domain,
                types,
                primaryType: 'Rebalance',
                message: {
                    riskTier: tier,
                    indices: indices.map(i => BigInt(i)),
                    allocations,
                    nonce
                }
            });

            const abiCoder = new ethers.AbiCoder();
            const stateData = abiCoder.encode(
                ["uint8", "uint256[]", "uint8[]"],
                [tier, indices, allocations]
            );

            // Get current version
            let currentVersion = this.channelVersion || 0n;
            try {
                const channelData = await this.nitroliteClient.getChannelData(this.channelId);
                if (channelData && channelData.lastValidState) {
                    currentVersion = channelData.lastValidState.version;
                }
            } catch (error) { }

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
                sigs: [signature],
                eip712Signature,
                nonce,
                vaultAddress
            };

            // Attempt checkpointing
            try {
                await this.nitroliteClient.checkpointChannel({
                    channelId: this.channelId,
                    candidateState: state
                });
            } catch (error) {
                logger.debug('ℹ️ Nitrolite on-chain checkpoint skipped (unsupported by vault contract)');
            }

            this.channelVersion = state.version;
            this.pendingSettlements.push(state);

            logger.info(`✅ Off-chain state signed for Tier ${tier} [Version: ${state.version}]`);
            return true;
        } catch (error) {
            logger.warn('⚠️ Nitrolite off-chain signing failed:', error.message || error);
            return false;
        }
    }

    decodeStateData(data) {
        const abiCoder = new ethers.AbiCoder();
        const [decodedTier, decodedIndices, decodedAllocations] = abiCoder.decode(
            ["uint8", "uint256[]", "uint8[]"],
            data
        );
        return {
            tier: Number(decodedTier),
            indices: Array.from(decodedIndices),
            allocations: Array.from(decodedAllocations)
        };
    }

    clearSettlements() {
        this.pendingSettlements = [];
    }

    close() {
        if (this.settlementTimer) clearInterval(this.settlementTimer);
        return this.channelId;
    }
}

module.exports = new NitroliteService();
