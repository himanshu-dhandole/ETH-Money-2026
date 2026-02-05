// Circle CCTP Configuration
// Addresses obtained from Circle CCTP Documentation

export enum CCTPDomain {
    Sepolia = 0,
    Arc = 26,
}

interface CCTPConfig {
    cctpDomain: number;
    tokenMessenger: `0x${string}`;
    messageTransmitter: `0x${string}`;
    usdcAddress: `0x${string}`;
}

export const cctpConfig: Record<number, CCTPConfig> = {
    11155111: { // Sepolia chainId
        cctpDomain: CCTPDomain.Sepolia,
        tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb668f5", // Sepolia TokenMessenger
        messageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD", // Sepolia MessageTransmitter
        usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
    },
    5042002: { // Arc Testnet chainId
        cctpDomain: CCTPDomain.Arc,
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA", // Arc TokenMessenger - verified from search
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275", // Arc MessageTransmitter - verified from search
        usdcAddress: import.meta.env.VITE_VIRTUAL_USDC_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000", // Fallback if env not loaded immediately
    },
};

// Helper to get chain config
export const getCCTPConfig = (chainId: number) => {
    return cctpConfig[chainId];
};
