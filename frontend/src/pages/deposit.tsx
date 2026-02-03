"use client";
import { useState, useEffect, useCallback } from "react";
import {
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { useAccount } from "wagmi";
import DefaultLayout from "@/layouts/default";
import { config } from "@/config/wagmiConfig";
import VIRTUAL_USDC_ABI from "@/abi/VirtualUSDC.json";
import VAULT_ROUTER_ABI from "@/abi/VaultRouter.json";
import { toast } from "sonner";
import { ArrowRight, Lock, Plus, TrendingUp, Gift, Wallet } from "lucide-react";
import { formatUnits, parseUnits } from "viem";

const USDC = import.meta.env.VITE_VIRTUAL_USDC_ADDRESS as `0x${string}`;
const VAULT = import.meta.env.VITE_VAULT_ROUTER_ADDRESS as `0x${string}`;

// Types
interface UserState {
  auraBalance: string;
  USDCBalance: string;
  totalDeposited: string;
  userValue: string;
}

interface VaultState {
  tvl: string;
  apy: string;
}

// Helper to format numbers with commas and fixed decimals
const formatNumber = (val: string | number, decimals: number = 2) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// Main Deposit Component
export default function Deposit() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [airdropLoading, setAirdropLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // State - Initialized with zeros
  const [userState, setUserState] = useState<UserState>({
    auraBalance: "0.00",
    USDCBalance: "0.00",
    totalDeposited: "0.00",
    userValue: "0.00",
  });

  const [_vaultState, setVaultState] = useState<VaultState>({
    tvl: "0.00",
    apy: "0.0",
  });

  const [amountInput, setAmountInput] = useState("");

  // Fetch User Data
  const fetchUserData = useCallback(async () => {
    if (!address) return;

    try {
      const balance = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      const position = (await readContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "getUserPosition",
        args: [address],
      })) as [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
      ];
      console.log(position);

      // position returns: [lowShares, medShares, highShares, lowValue, medValue, highValue, totalValue, totalDeposited, profitLoss]
      const [, , , , , , totalValue, totalDeposited] = position;

      setUserState({
        USDCBalance: formatUnits(balance, 18),
        totalDeposited: formatUnits(totalDeposited, 18),
        userValue: formatUnits(totalValue, 18),
        auraBalance: formatUnits(totalValue, 18),
      });
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  }, [address]);

  // Fetch Vault Data
  const fetchVaultData = useCallback(async () => {
    try {
      const stats = (await readContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "getProtocolStats",
      })) as [bigint, bigint, bigint, bigint];

      // stats returns: [totalValueLocked, lowVaultTVL, medVaultTVL, highVaultTVL]
      const [totalValueLocked] = stats;

      const apys = (await readContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "getVaultAPYs",
      })) as [bigint, bigint, bigint];

      // apys returns: [lowAPY, medAPY, highAPY]
      const [lowAPY, medAPY, highAPY] = apys;
      const averageAPY =
        (Number(lowAPY) + Number(medAPY) + Number(highAPY)) / 3 / 100; // Assuming APY is in bps

      setVaultState({
        tvl: formatUnits(totalValueLocked, 18),
        apy: averageAPY.toFixed(1),
      });
    } catch (err) {
      console.error("Error fetching vault data:", err);
    }
  }, []);

  // Airdrop USDC
  const handleAirdrop = useCallback(async () => {
    if (!address) return;

    try {
      const hasClaimed = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "hasClaimed",
        args: [address],
      })) as boolean;

      if (hasClaimed) {
        toast.error("Already claimed test tokens");
        return;
      }

      setAirdropLoading(true);
      const toastId = toast.loading("Claiming test tokens...");

      const tx = await writeContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "airdrop",
        account: address,
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("10,000 vUSDC claimed successfully", { id: toastId });
      await fetchUserData();
    } catch (err) {
      toast.error("Failed to claim tokens");
      console.error(err);
    } finally {
      setAirdropLoading(false);
    }
  }, [address, fetchUserData]);

  // Deposit
  const handleDeposit = useCallback(async () => {
    if (!address || !amountInput) return;
    setLoading(true);

    const toastId = toast.loading("Preparing deposit...");

    try {
      const amount = parseUnits(amountInput, 18);

      const allowance = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, VAULT],
      })) as bigint;

      if (allowance < amount) {
        toast.loading("Approving tokens...", { id: toastId });
        const approveTx = await writeContract(config, {
          address: USDC,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [VAULT, amount],
        });
        await waitForTransactionReceipt(config, { hash: approveTx });
      }

      toast.loading("Depositing to vault...", { id: toastId });
      const tx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "deposit",
        args: [amount],
      });

      await waitForTransactionReceipt(config, { hash: tx });
      toast.success(`Deposited ${formatNumber(amountInput)} vUSDC`, {
        id: toastId,
      });
      setAmountInput("");
      await Promise.all([fetchUserData(), fetchVaultData()]);
    } catch (err) {
      toast.error("Deposit failed", { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address, amountInput, fetchUserData, fetchVaultData]);

  // Withdraw
  const handleWithdraw = useCallback(async () => {
    if (!address || !amountInput || parseFloat(amountInput) <= 0) return;
    setLoading(true);

    const toastId = toast.loading("Processing withdrawal...");

    try {
      const inputAmount = parseUnits(amountInput, 18);
      const totalValue = parseUnits(userState.userValue, 18);

      let tx;
      if (inputAmount >= totalValue) {
        // Withdraw All
        tx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawAll",
          gas: 5_000_000n,
        });
      } else {
        // Withdraw Partial - calculate percentage in basis points (10000 = 100%)
        const percentageBps = (inputAmount * 10000n) / totalValue;
        tx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawPartial",
          args: [percentageBps],
          gas: 5_000_000n,
        });
      }

      await waitForTransactionReceipt(config, { hash: tx });
      toast.success(`Withdrew ${formatNumber(amountInput)} vUSDC`, {
        id: toastId,
      });
      setAmountInput("");
      await Promise.all([fetchUserData(), fetchVaultData()]);
    } catch (err) {
      toast.error("Withdrawal failed", { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    address,
    amountInput,
    userState.userValue,
    fetchUserData,
    fetchVaultData,
  ]);

  const quickAmounts = ["100", "500", "1000", "5000"];
  const quickLabels = ["$100", "$500", "$1k", "$5k"];

  // Initial load
  useEffect(() => {
    if (address) {
      fetchUserData();
      fetchVaultData();

      const interval = setInterval(() => {
        fetchUserData();
        fetchVaultData();
      }, 20000);

      return () => clearInterval(interval);
    }
  }, [address, fetchUserData, fetchVaultData]);

  const handleHarvest = async () => {
    if (!address) return;
    setLoading(true);

    const toastId = toast.loading("Harvesting yield from all vaults...");

    try {
      const tx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "harvestAll",
        account: address,
        gas: 5_000_000n,
      });
      const receipt = await waitForTransactionReceipt(config, { hash: tx });
      if (receipt.status === "success") {
        toast.success("Yield harvested successfully", { id: toastId });
        await fetchUserData();
        await fetchVaultData();
      } else {
        toast.error("Harvest failed", { id: toastId });
      }
    } catch (err) {
      toast.error("Harvest failed", { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRebalance = async () => {
    if (!address) return;
    setLoading(true);

    const toastId = toast.loading("Rebalancing your position...");

    try {
      const tx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "rebalance",
        account: address,
        gas: 5_000_000n,
      });
      const receipt = await waitForTransactionReceipt(config, { hash: tx });
      if (receipt.status === "success") {
        toast.success("Position rebalanced successfully", { id: toastId });
        await fetchUserData();
        await fetchVaultData();
      } else {
        toast.error("Rebalance failed", { id: toastId });
      }
    } catch (err) {
      toast.error("Rebalance failed", { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <DefaultLayout>
        <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#16181D] flex items-center justify-center mx-auto mb-4 border border-white/5">
              <Wallet className="w-8 h-8 text-[#135bec]" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-white">
              Connect Wallet
            </h1>
            <p className="text-gray-500">
              Connect your wallet to deposit & withdraw
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="flex flex-col lg:flex-row min-h-screen relative overflow-hidden font-sans">
        {/* LEFT PANEL: Total Balance & Withdraw */}
        <section className="flex-1 bg-[#0B0C10] flex flex-col justify-center items-center relative p-8 lg:p-20 border-b lg:border-b-0 lg:border-r border-white/5">
          {/* Subtle radial background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(19,91,236,0.03),transparent_40%)] pointer-events-none" />

          <div className="w-full max-w-md flex flex-col gap-8 z-0 relative">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xl">🔷</span>
                <span className="uppercase tracking-widest text-xs font-semibold">
                  Total Deposited
                </span>
              </div>

              <div className="relative">
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-white">
                  ${formatNumber(userState.userValue)}
                </h1>

                {/* Visual placeholder watermark */}
                <div className="absolute -right-4 -top-2 lg:-right-8 lg:-top-4 opacity-50">
                  <span className="text-[48px] lg:text-[64px] text-white/5 -rotate-12 select-none">
                    $
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <p className="text-gray-500 text-sm mb-4">
                Funds are available for withdrawal instantly.
              </p>
              <button
                onClick={() => {
                  setActiveTab(
                    activeTab === "deposit" ? "withdraw" : "deposit",
                  );
                  setAmountInput("");
                }}
                className="w-full sm:w-auto h-14 px-8 rounded-xl border border-white/20 text-white font-bold hover:bg-white/5 hover:border-white/40 active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <span>
                  {activeTab === "deposit"
                    ? "Withdraw Funds"
                    : "Initialize Deposit"}
                </span>
                {activeTab === "deposit" ? (
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                ) : (
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
              </button>
              <div className="glass-panel rounded-2xl p-8 mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Harvest Button */}
                  <button
                    onClick={handleHarvest}
                    disabled={loading}
                    className="group relative overflow-hidden bg-gradient-to-r from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-500/40 rounded-xl p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-white mb-1">
                          Harvest Yield
                        </h4>
                        <p className="text-sm text-gray-400">
                          Collect accumulated yield from all vaults
                        </p>
                      </div>
                      <Gift className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>

                  {/* Rebalance Button */}
                  <button
                    onClick={handleRebalance}
                    disabled={loading}
                    className="group relative overflow-hidden bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-white mb-1">
                          Rebalance
                        </h4>
                        <p className="text-sm text-gray-400">
                          Update allocation to match risk profile
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Add Funds */}
        <section className="flex-1 bg-[#16181D] flex flex-col justify-center items-center relative p-8 lg:p-20">
          {/* Background decoration */}
          <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

          <div className="w-full max-w-md flex flex-col gap-8 z-0 relative">
            {/* Promo Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 p-6 shadow-2xl group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Gift className="w-32 h-32 text-[#135bec] -rotate-12 translate-x-8 -translate-y-8" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#135bec] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    New User
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Get 1,000 USDC Test Tokens
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Start testing the vault immediately without spending real
                  money.
                </p>
                <button
                  onClick={handleAirdrop}
                  disabled={airdropLoading}
                  className="h-10 px-4 bg-white text-[#0B0C10] text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 bg-[#0B0C10] text-white rounded-full p-0.5" />
                  Claim Free Tokens
                </button>
              </div>
            </div>

            {/* Deposit Form */}
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <label className="uppercase tracking-widest text-xs font-semibold text-gray-400">
                  {activeTab === "deposit"
                    ? "Deposit Amount"
                    : "Withdraw Amount"}
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{activeTab === "deposit" ? "Wallet:" : "Staked:"}</span>
                  <span className="font-mono text-white">
                    {activeTab === "deposit"
                      ? `$${formatNumber(userState.USDCBalance)}`
                      : `${formatNumber(userState.auraBalance)} AURA`}
                  </span>
                </div>
              </div>

              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-xl font-medium">
                    {activeTab === "deposit" ? "$" : "✧"}
                  </span>
                </div>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="block w-full pl-10 pr-24 py-5 bg-black/20 border border-white/10 rounded-xl text-3xl font-bold text-white placeholder-gray-600 focus:ring-2 focus:ring-[#135bec] focus:border-transparent transition-all outline-none"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    onClick={() =>
                      setAmountInput(
                        activeTab === "deposit"
                          ? userState.USDCBalance
                          : userState.auraBalance,
                      )
                    }
                    className="bg-white/5 hover:bg-white/10 text-[#135bec] text-xs font-bold py-1.5 px-3 rounded-lg border border-white/5 transition-colors uppercase tracking-wider"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quickAmounts.map((amount, idx) => (
                  <button
                    key={amount}
                    onClick={() => setAmountInput(amount)}
                    className="py-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 transition-colors"
                  >
                    {quickLabels[idx]}
                  </button>
                ))}
              </div>

              {/* Deposit Action */}
              <button
                onClick={
                  activeTab === "deposit" ? handleDeposit : handleWithdraw
                }
                disabled={
                  loading || !amountInput || parseFloat(amountInput) <= 0
                }
                className={`w-full h-14 text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(19,91,236,0.15)] hover:shadow-[0_0_30px_rgba(19,91,236,0.3)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                  activeTab === "deposit"
                    ? "bg-[#135bec] text-white hover:bg-[#1152d6]"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
              >
                {activeTab === "deposit" ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <TrendingUp className="w-5 h-5" />
                )}
                {activeTab === "deposit"
                  ? "Deposit to Vault"
                  : "Withdraw Assets"}
              </button>

              <p className="text-center text-xs text-gray-500 mt-2">
                No lock-up period. Withdraw anytime.
              </p>
            </div>
          </div>

          {/* Action Buttons Section */}
        </section>
      </div>
    </DefaultLayout>
  );
}
