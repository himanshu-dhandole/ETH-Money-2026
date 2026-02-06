import DefaultLayout from "@/layouts/default";
import {
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { config } from "@/config/wagmiConfig";
import VIRTUAL_USDC_ABI from "@/abi/VirtualUSDC.json";
import RESERVE_ABI from "@/abi/Reserve.json";
import { useAccount } from "wagmi";
import { useCallback, useState } from "react";
import { formatUnits } from "viem";
import { toast } from "sonner";

const USDC = import.meta.env.VITE_VIRTUAL_USDC_ADDRESS as `0x${string}`;
const RESERVE = import.meta.env.VITE_RESERVE as `0x${string}`;





const Test = () => {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [gatewayBalances, setGatewayBalances] = useState<{
    total: number;
    maxTransferable: number;
    balances: Array<{ chain: string; amount: number }>;
  } | null>(null);



  /* --------------------------------------------------
     GATEWAY BALANCE CHECK
  -------------------------------------------------- */

  const GATEWAY_DOMAINS = {
    sepolia: 0,
    avalancheFuji: 1,
    baseSepolia: 6,
    arcTestnet: 26,
    hyperliquidEvmTestnet: 19,
    seiTestnet: 16,
    sonicTestnet: 13,
    worldchainSepolia: 14,
  };

  const checkGatewayBalances = useCallback(async () => {
    if (!address) return;

    const toastId = toast.loading("Checking Gateway balances...");

    try {
      const body = {
        token: "USDC",
        sources: Object.entries(GATEWAY_DOMAINS).map(([_, domain]) => ({
          domain,
          depositor: address,
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
      const balances = [];

      for (const balance of result.balances) {
        const chain =
          Object.keys(GATEWAY_DOMAINS).find(
            (key) => GATEWAY_DOMAINS[key as keyof typeof GATEWAY_DOMAINS] === balance.domain,
          ) || `Domain ${balance.domain}`;
        const amount = parseFloat(balance.balance);

        if (amount > 0) {
          balances.push({ chain, amount });
        }
        total += amount;
      }

      const maxFee = 2.01;
      const maxTransferable = Math.max(0, total - maxFee);

      setGatewayBalances({ total, maxTransferable, balances });

      console.log("=".repeat(50));
      console.log("Gateway Wallet Balances:");
      console.log("=".repeat(50));
      balances.forEach(b => {
        console.log(`${b.chain.padEnd(25)}: ${b.amount.toFixed(6)} USDC`);
      });
      console.log("=".repeat(50));
      console.log(`Total: ${total.toFixed(6)} USDC`);
      console.log(`Max Transferable: ${maxTransferable.toFixed(6)} USDC (after 2.01 fee)`);
      console.log("=".repeat(50));

      toast.success(`Total Gateway Balance: ${total.toFixed(2)} USDC`, { id: toastId });
    } catch (error: any) {
      console.error("Gateway balance check error:", error);
      toast.error(error.message || "Failed to check balances", { id: toastId });
    }
  }, [address]);

  const reserveBalance = async () => {
    if (!RESERVE) {
      setResult("Error: RESERVE address not set in .env");
      return;
    }

    try {
      setLoading(true);
      const balance = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "balanceOf",
        args: [RESERVE],
      })) as bigint;

      setResult(`Reserve Balance: ${formatUnits(balance, 6)} USDC`);
      console.log("Reserve balance:", formatUnits(balance, 6));
    } catch (err: any) {
      console.error(err);
      setResult(`Error: ${err.message || "Failed to fetch balance"}`);
    } finally {
      setLoading(false);
    }
  };

  const fundReserve = async () => {
    if (!address) {
      setResult("Error: Please connect wallet");
      return;
    }

    if (!RESERVE) {
      setResult("Error: RESERVE address not set in .env");
      return;
    }

    try {
      setLoading(true);
      const amount = 2n * 1000000n; // 100 USDC (6 decimals)

      setResult("Step 1/3: Checking allowance...");

      // Check current allowance
      const currentAllowance = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, RESERVE],
      })) as bigint;

      // Approve if needed
      if (currentAllowance < amount) {
        setResult("Step 2/3: Approving USDC...");
        const approveTx = await writeContract(config, {
          address: USDC,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [RESERVE, amount],
        });

        await waitForTransactionReceipt(config, { hash: approveTx });
        console.log("Approved:", approveTx);
      }

      setResult("Step 3/3: Funding reserve...");

      // Fund the reserve
      const fundTx = await writeContract(config, {
        address: RESERVE,
        abi: RESERVE_ABI,
        functionName: "fund",
        args: [amount],
      });

      const receipt = await waitForTransactionReceipt(config, {
        hash: fundTx,
      });

      if (receipt.status === "success") {
        setResult(`✅ Success! Funded ${formatUnits(amount, 6)} USDC`);
        console.log("Funded successfully:", fundTx);
      } else {
        setResult("❌ Transaction failed");
      }
    } catch (err: any) {
      console.error(err);
      setResult(
        `❌ Error: ${err.shortMessage || err.message || "Failed to fund"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="min-h-screen bg-[#0B0C10] p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">
            🧪 Reserve Testing
          </h1>

          <div className="glass-panel rounded-2xl p-8 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Contract Addresses
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">USDC:</span>
                <span className="text-white font-mono">
                  {USDC || "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reserve:</span>
                <span className="text-white font-mono">
                  {RESERVE || "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Address:</span>
                <span className="text-white font-mono">
                  {address || "Not connected"}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-8 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Actions</h2>

            <div className="space-y-4">
              <button
                onClick={reserveBalance}
                disabled={loading}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Loading..." : "Check Reserve Balance"}
              </button>

              <button
                onClick={fundReserve}
                disabled={loading}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Processing..." : "Fund Reserve (100 USDC)"}
              </button>
            </div>
          </div>

          {result && (
            <div
              className={`glass-panel rounded-2xl p-6 ${result.includes("Error") || result.includes("❌")
                  ? "border-red-500/50"
                  : result.includes("✅")
                    ? "border-green-500/50"
                    : "border-blue-500/50"
                }`}
            >
              <p
                className={`font-mono text-sm ${result.includes("Error") || result.includes("❌")
                    ? "text-red-400"
                    : result.includes("✅")
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
              >
                {result}
              </p>
            </div>
          )}
        </div>

        {/* Gateway Balance Check */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/20 to-blue-800/20 border border-blue-500/20 p-6 shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Gateway Balance
                </h3>
                <p className="text-gray-400 text-sm">
                  Check your USDC balance across all chains
                </p>
              </div>
              <button
                onClick={checkGatewayBalances}
                disabled={loading || !address}
                className="h-10 px-4 bg-[#135bec] hover:bg-[#0d4ab8] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check Balance
              </button>
            </div>

            {gatewayBalances && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400 text-sm">Total Balance:</span>
                  <span className="text-white font-bold">{gatewayBalances.total.toFixed(6)} USDC</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="text-gray-400 text-sm">Max Transferable:</span>
                  <span className="text-green-400 font-bold">{gatewayBalances.maxTransferable.toFixed(6)} USDC</span>
                </div>
                {gatewayBalances.balances.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-500 mb-2">Balances by chain:</p>
                    {gatewayBalances.balances.map((b) => (
                      <div key={b.chain} className="flex justify-between text-xs text-gray-400 py-1">
                        <span>{b.chain}</span>
                        <span>{b.amount.toFixed(6)} USDC</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Test;
