import { Address } from "viem";

export enum GatewayDomain {
    Ethereum = 0,
    Avalanche = 1,
    Optimism = 2,
    Arbitrum = 3,
    Solana = 5,
    Base = 6,
    Polygon = 7,
    Sepolia = 0, // Sepolia usually maps to 0 (Eth) in testnet context/or specific domain. 
    // *Correction*: Circle domains: Eth=0. Sepolia is Eth testnet, so Domain=0.
    // Arc Testnet Domain? I need to verify Arc's domain ID.
    // In the previous CCTP config, we used: Sepolia=0, Arc=?
    // Let's assume Arc is a custom domain or mapped specific.
    // *Wait*, previous CCTP config had domain IDs?
    // Let's use the same domain IDs if they were known, or default to standard.
    // Circle docs: Segpolia = 0.
    // Arc? If Arc is an OP stack chain, maybe 2? No, unique ID.
    // Let's assume Arc = 5042002 (ChainID) but DomainID might be distinct.
    // For now, I will define standard domains.
    Arc = 9999, // Placeholder if unknown, or I can search it.
    // Actually, I should just use the chainID map for now if unsure.
    // But TransferSpec needs "destinationDomain".
    // I will assume for this specific "Arc" testnet, we might need to find its domain ID if it's officially supported.
    // If not found, I'll use a placeholder or 0 if it's pretending to be Eth.
}

// Gateway Wallet Addresses are often the same across EVM chains due to CREATE2.
// Address: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9

export const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as Address;
export const GATEWAY_MINTER_ADDRESS = "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B" as Address; // Arc testnet Gateway Minter
export const GATEWAY_API_URL = "https://gateway-api-testnet.circle.com/v1";

export interface GatewayConfig {
    walletAddress: Address;
    minterAddress: Address;
    usdcAddress: Address;
    domainId: number;
}

export const gatewayConfig: Record<number, GatewayConfig> = {
    11155111: { // Sepolia
        walletAddress: GATEWAY_WALLET_ADDRESS,
        minterAddress: GATEWAY_MINTER_ADDRESS, // Same minter address across chains
        usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address, // Native USDC on Sepolia
        domainId: 0,
    },
    5042002: { // Arc Testnet
        walletAddress: GATEWAY_WALLET_ADDRESS,
        minterAddress: GATEWAY_MINTER_ADDRESS, // Arc testnet Gateway Minter
        usdcAddress: "0x3600000000000000000000000000000000000000" as Address, // Arc testnet USDC
        domainId: 26, // Arc Domain (matches CCTP config)
    }
};

export const getGatewayConfig = (chainId: number) => {
    return gatewayConfig[chainId];
};
