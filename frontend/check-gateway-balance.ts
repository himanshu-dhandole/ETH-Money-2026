import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const DOMAINS = {
    sepolia: 0,
    avalancheFuji: 1,
    baseSepolia: 6,
    arcTestnet: 26,
    hyperliquidEvmTestnet: 19,
    seiTestnet: 16,
    sonicTestnet: 13,
    worldchainSepolia: 14,
};

async function main() {
    // Get the private key from environment or use a placeholder
    const privateKey = process.env.VITE_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;

    if (!privateKey) {
        console.error("Error: Missing VITE_PRIVATE_KEY or EVM_PRIVATE_KEY in environment");
        console.log("\nPlease set your private key in .env file:");
        console.log("VITE_PRIVATE_KEY=0x...");
        process.exit(1);
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const depositor = account.address;

    console.log(`Depositor address: ${depositor}\n`);
    console.log("Checking Gateway balances across all chains...\n");

    const body = {
        token: "USDC",
        sources: Object.entries(DOMAINS).map(([_, domain]) => ({
            domain,
            depositor,
        })),
    };

    const res = await fetch(
        "https://gateway-api-testnet.circle.com/v1/balances",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        },
    );

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Gateway API error: ${res.status} ${error}`);
    }

    const result = await res.json();

    let total = 0;
    console.log("=".repeat(50));
    console.log("Gateway Wallet Balances:");
    console.log("=".repeat(50));

    for (const balance of result.balances) {
        const chain =
            Object.keys(DOMAINS).find(
                (key) => DOMAINS[key as keyof typeof DOMAINS] === balance.domain,
            ) || `Domain ${balance.domain}`;
        const amount = parseFloat(balance.balance);
        console.log(`${chain.padEnd(25)}: ${amount.toFixed(6)} USDC`);
        total += amount;
    }

    console.log("=".repeat(50));
    console.log(`Total across all chains: ${total.toFixed(6)} USDC`);
    console.log("=".repeat(50));

    // Calculate max transferable amount (total - fee)
    const maxFee = 2.01; // 2.01 USDC fee
    const maxTransferable = Math.max(0, total - maxFee);

    console.log(`\nWith 2.01 USDC fee, you can transfer up to: ${maxTransferable.toFixed(6)} USDC`);

    if (total < maxFee) {
        console.log("\n⚠️  WARNING: Insufficient balance to make any transfer!");
        console.log(`   You need at least ${maxFee} USDC to cover the Gateway fee.`);
        console.log("   Get more USDC from: https://faucet.circle.com");
    }
}

main().catch((error) => {
    console.error("\nError:", error);
    process.exit(1);
});
