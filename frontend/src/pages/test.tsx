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
import { useState } from "react";
import { formatUnits } from "viem";

const USDC = import.meta.env.VITE_VIRTUAL_USDC_ADDRESS as `0x${string}`;
const RESERVE = import.meta.env.VITE_RESERVE as `0x${string}`;

const Test = () => {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

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
              className={`glass-panel rounded-2xl p-6 ${
                result.includes("Error") || result.includes("❌")
                  ? "border-red-500/50"
                  : result.includes("✅")
                    ? "border-green-500/50"
                    : "border-blue-500/50"
              }`}
            >
              <p
                className={`font-mono text-sm ${
                  result.includes("Error") || result.includes("❌")
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
      </div>
    </DefaultLayout>
  );
};

export default Test;
