"use client";
import React, { useState, useEffect } from "react";
import DefaultLayout from "@/layouts/default";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { config } from "@/config/wagmiConfig";
import { toast } from "sonner";
import {
  Shield,
  Wallet,
  BarChart3,
  Settings,
  RefreshCw,
  ArrowDownCircle,
  Gem,
  Activity,
} from "lucide-react";

// ABIs
import RESERVE_ABI from "@/abi/Reserve.json";
import VAULT_ROUTER_ABI from "@/abi/VaultRouter.json";
import VIRTUAL_USDC_ABI from "@/abi/VirtualUSDC.json";
import BASE_VAULT_ABI from "@/abi/BaseVault.json";

// Contract Addresses
const RESERVE_ADDRESS = (import.meta.env.VITE_RESERVE || "") as `0x${string}`;
const ROUTER_ADDRESS = (import.meta.env.VITE_VAULT_ROUTER_ADDRESS ||
  "") as `0x${string}`;
const USDC_ADDRESS = (import.meta.env.VITE_VIRTUAL_USDC_ADDRESS ||
  "") as `0x${string}`;

// Vaults
const LOW_RISK_VAULT = import.meta.env.VITE_LOW_RISK_VAULT as `0x${string}`;
const MID_RISK_VAULT = import.meta.env.VITE_MEDIUM_RISK_VAULT as `0x${string}`;
const HIGH_RISK_VAULT = import.meta.env.VITE_HIGH_RISK_VAULT as `0x${string}`;

// Helper for formatting
const formatUSDC = (val: bigint) => formatUnits(val, 6);
const parseUSDC = (val: string) => parseUnits(val, 6);
const formatNumber = (val: string) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    parseFloat(val),
  );

const Admin = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    reserveAvailable: "0",
    reserveDistributed: "0",
    reserveEfficiency: "0",
    routerTVL: "0",
    usdcBalance: "0",
  });

  // Inputs
  const [fundAmount, setFundAmount] = useState("1000");

  const fetchData = async () => {
    if (!isConnected || !address) return;

    try {
      // 1. Reserve Stats
      const reserveStats = (await readContract(config, {
        address: RESERVE_ADDRESS,
        abi: RESERVE_ABI,
        functionName: "getStats",
      })) as [bigint, bigint, bigint];

      const [available, distributed, efficiency] = reserveStats;

      // 2. Router Stats
      const routerStats = (await readContract(config, {
        address: ROUTER_ADDRESS,
        abi: VAULT_ROUTER_ABI,
        functionName: "getProtocolStats",
      })) as [bigint, bigint, bigint, bigint];

      // 3. User USDC Balance (Admin)
      const usdcBal = (await readContract(config, {
        address: USDC_ADDRESS,
        abi: VIRTUAL_USDC_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      setStats({
        reserveAvailable: formatUSDC(available),
        reserveDistributed: formatUSDC(distributed),
        reserveEfficiency: efficiency.toString(),
        routerTVL: formatUSDC(routerStats[0]),
        usdcBalance: formatUSDC(usdcBal),
      });
    } catch (e) {
      console.error("Fetch Data Error:", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [address, isConnected]);

  // Actions
  const handleFundReserve = async () => {
    if (!fundAmount) return;
    setLoading(true);
    const toastId = toast.loading("Funding Reserve...");

    try {
      const amount = parseUSDC(fundAmount);

      // 1. Check Allowance
      const allowance = (await readContract(config, {
        address: USDC_ADDRESS,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, RESERVE_ADDRESS],
      })) as bigint;

      if (allowance < amount) {
        toast.message("Approving USDC...", { id: toastId });
        const approveTx = await writeContract(config, {
          address: USDC_ADDRESS,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [RESERVE_ADDRESS, amount],
        });
        await waitForTransactionReceipt(config, { hash: approveTx });
      }

      // 2. Fund
      toast.message("Depositing to Reserve...", { id: toastId });
      const tx = await writeContract(config, {
        address: RESERVE_ADDRESS,
        abi: RESERVE_ABI,
        functionName: "fund",
        args: [amount],
      });
      await waitForTransactionReceipt(config, { hash: tx });

      toast.success("Reserve Funded Successfully!", { id: toastId });
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || "Funding Failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleHarvestAll = async () => {
    setLoading(true);
    const toastId = toast.loading("Harvesting All Vaults...");
    try {
      const tx = await writeContract(config, {
        address: ROUTER_ADDRESS,
        abi: VAULT_ROUTER_ABI,
        functionName: "harvestAll",
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("Harvest Complete!", { id: toastId });
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || "Harvest Failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <DefaultLayout>
        <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-2xl border border-white/10 text-center">
            <Shield className="w-16 h-16 text-[#135bec] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Admin Access Required
            </h1>
            <p className="text-gray-400">
              Please connect your wallet to access the dashboard.
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="relative min-h-screen w-full bg-[#0B0C10] text-white font-sans overflow-x-hidden p-6 md:p-12">
        {/* Ambient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[20%] right-0 w-[600px] h-[600px] rounded-full bg-[#135bec]/5 blur-[120px]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto space-y-12 pt-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-[#135bec]" />
                <h1 className="text-4xl font-bold tracking-tight">
                  Admin Dashboard
                </h1>
              </div>
              <p className="text-gray-400">
                Manage Yield Reserve, Strategies, and Protocol Health
              </p>
            </div>
            <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-xl border border-white/10">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-widest">
                  Admin Wallet
                </p>
                <p className="font-mono text-sm">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-gray-500" />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              label="Protocol TVL"
              value={`$${formatNumber(stats.routerTVL)}`}
              icon={<BarChart3 className="w-6 h-6 text-purple-400" />}
            />
            <StatCard
              label="Reserve Available"
              value={`$${formatNumber(stats.reserveAvailable)}`}
              icon={<Gem className="w-6 h-6 text-blue-400" />}
            />
            <StatCard
              label="Yield Distributed"
              value={`$${formatNumber(stats.reserveDistributed)}`}
              icon={<Activity className="w-6 h-6 text-green-400" />}
            />
            <StatCard
              label="Reserve Efficiency"
              value={`${stats.reserveEfficiency}%`}
              icon={<Settings className="w-6 h-6 text-orange-400" />}
            />
          </div>

          {/* Main Control Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 1. Yield Reserve Controls */}
            <div className="lg:col-span-2 space-y-8">
              <div className="glass-panel bg-[#16181D]/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Gem className="w-6 h-6 text-[#135bec]" />
                    Yield Reserve Management
                  </h2>
                  <span className="bg-blue-500/10 text-blue-400 text-xs px-3 py-1 rounded-full border border-blue-500/20 font-mono">
                    {RESERVE_ADDRESS
                      ? `${RESERVE_ADDRESS.slice(0, 8)}...${RESERVE_ADDRESS.slice(-6)}`
                      : "Not Configured"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Fund Reserve */}
                  <div className="space-y-4">
                    <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">
                      Fund Reserve
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-8 pr-20 text-xl font-bold focus:ring-2 focus:ring-[#135bec] outline-none transition-all"
                      />
                      <button
                        onClick={() => setFundAmount(stats.usdcBalance)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-white/10 hover:bg-white/20 text-blue-400 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        MAX
                      </button>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 px-1">
                      <span>Wallet Balance:</span>
                      <span className="text-white font-mono">
                        ${formatNumber(stats.usdcBalance)}
                      </span>
                    </div>
                    <button
                      onClick={handleFundReserve}
                      disabled={loading || parseFloat(fundAmount) <= 0}
                      className="w-full py-4 bg-[#135bec] hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(19,91,236,0.2)]"
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                      Fund Reserve
                    </button>
                  </div>

                  {/* Usage Stats Visual */}
                  <div className="bg-black/20 rounded-xl p-6 border border-white/5 flex flex-col justify-center">
                    <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-4">
                      Capital Efficiency
                    </label>
                    <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                        style={{
                          width: `${Math.min(parseFloat(stats.reserveEfficiency) || 0, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0% Utilized</span>
                      <span>{stats.reserveEfficiency}% Target</span>
                    </div>
                    <p className="mt-4 text-sm text-gray-400 leading-relaxed">
                      Reserve funds are automatically distributed to strategies
                      to simulate yield. Higher efficiency means better capital
                      utilization.
                    </p>
                  </div>
                </div>
              </div>

              {/* Vault Management */}
              <div className="glass-panel bg-[#16181D]/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-green-400" />
                    Protocol Operations
                  </h2>
                  <span className="bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/20 font-mono">
                    Online
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ActionButton
                    title="Harvest All Yields"
                    description="Claims available yield from all active strategies."
                    icon={<Gem className="w-5 h-5" />}
                    color="green"
                    onClick={handleHarvestAll}
                    loading={loading}
                  />
                  <ActionButton
                    title="Emergency Withdraw"
                    description="Withdraws all funds from reserve to owner."
                    icon={<Shield className="w-5 h-5" />}
                    color="red"
                    onClick={async () => {
                      if (
                        !confirm("Are you sure? This will empty the reserve.")
                      )
                        return;
                      setLoading(true);
                      try {
                        const tx = await writeContract(config, {
                          address: RESERVE_ADDRESS,
                          abi: RESERVE_ABI,
                          functionName: "emergencyWithdraw",
                          args: [parseUSDC(stats.reserveAvailable)],
                        });
                        await waitForTransactionReceipt(config, { hash: tx });
                        toast.success("Emergency Withdraw Successful");
                        fetchData();
                      } catch (e: any) {
                        toast.error(e?.shortMessage || "Failed");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    loading={loading}
                  />
                </div>

                {/* Authorize Strategy */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-2 block">
                    Authorize Strategy
                  </label>
                  <StrategyAuthForm
                    reserveAddress={RESERVE_ADDRESS}
                    reserveAbi={RESERVE_ABI}
                  />
                </div>
              </div>

              {/* Vault Management Component */}
              <VaultManagementSection />
            </div>

            {/* 2. Addresses & Config */}
            <div className="space-y-6">
              <div className="glass-panel bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-400" />
                  System Contracts
                </h3>
                <div className="space-y-4">
                  <AddressRow label="Vault Router" address={ROUTER_ADDRESS} />
                  <AddressRow label="Yield Reserve" address={RESERVE_ADDRESS} />
                  <AddressRow
                    label="Risk NFT"
                    address={import.meta.env.VITE_RISK_NFT_ADDRESS}
                  />
                  <AddressRow label="USDC Token" address={USDC_ADDRESS} />
                </div>
              </div>

              <div className="glass-panel bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-gray-400" />
                  Active Vaults
                </h3>
                <div className="space-y-4">
                  <AddressRow
                    label="Low Risk"
                    address={LOW_RISK_VAULT}
                    color="blue"
                  />
                  <AddressRow
                    label="Medium Risk"
                    address={MID_RISK_VAULT}
                    color="yellow"
                  />
                  <AddressRow
                    label="High Risk"
                    address={HIGH_RISK_VAULT}
                    color="red"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

// UI Components
const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <div className="bg-[#16181D]/80 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
    <div className="flex justify-between items-start mb-4">
      <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">
        {label}
      </span>
      <div className="p-2 bg-white/5 rounded-lg border border-white/5">
        {icon}
      </div>
    </div>
    <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
  </div>
);

const AddressRow = ({
  label,
  address,
  color = "gray",
}: {
  label: string;
  address: string;
  color?: string;
}) => (
  <div className="group">
    <div className="flex justify-between items-baseline mb-1">
      <span
        className={`text-xs font-semibold uppercase tracking-wider text-${color === "gray" ? "gray-500" : color + "-400"}`}
      >
        {label}
      </span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(address);
          toast.success("Copied!");
        }}
        className="text-[10px] text-blue-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        COPY
      </button>
    </div>
    <div
      className="bg-black/40 border border-white/5 rounded-lg p-2 font-mono text-xs text-gray-300 truncate hover:text-white transition-colors cursor-pointer"
      title={address}
    >
      {address}
    </div>
  </div>
);

const ActionButton = ({
  title,
  description,
  icon,
  color,
  onClick,
  loading,
}: any) => {
  const colorClasses = {
    green:
      "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20",
    red: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20",
  }[color as "green" | "red" | "blue"];

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all active:scale-[0.98] ${colorClasses}`}
    >
      <div className="flex items-center gap-2 font-bold">
        {icon}
        {title}
      </div>
      <p className="text-xs text-left opacity-80">{description}</p>
    </button>
  );
};

const StrategyAuthForm = ({ reserveAddress, reserveAbi, onSuccess }: any) => {
  const [strategyAddr, setStrategyAddr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!strategyAddr) return;
    setLoading(true);
    const toastId = toast.loading("Authorizing Strategy...");
    try {
      const tx = await writeContract(config, {
        address: reserveAddress,
        abi: reserveAbi,
        functionName: "authorizeStrategy",
        args: [strategyAddr, true],
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("Strategy Authorized!", { id: toastId });
      setStrategyAddr("");
      if (onSuccess) onSuccess();
    } catch (e: any) {
      toast.error(e?.shortMessage || "Authorization Failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="0x..."
        value={strategyAddr}
        onChange={(e) => setStrategyAddr(e.target.value)}
        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={handleAuth}
        disabled={loading || !strategyAddr}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
      >
        {loading ? "..." : "Authorize"}
      </button>
    </div>
  );
};

const VaultManagementSection = () => {
  const [activeTab, setActiveTab] = useState<"low" | "mid" | "high">("low");
  const [strategyAddr, setStrategyAddr] = useState("");
  const [allocation, setAllocation] = useState("2000"); // 20% default
  const [loading, setLoading] = useState(false);

  const vaultAddress =
    activeTab === "low"
      ? LOW_RISK_VAULT
      : activeTab === "mid"
        ? MID_RISK_VAULT
        : HIGH_RISK_VAULT;

  const handleAddStrategy = async () => {
    if (!strategyAddr) return;
    setLoading(true);
    const toastId = toast.loading("Adding Strategy...");
    try {
      const tx = await writeContract(config, {
        address: vaultAddress,
        abi: BASE_VAULT_ABI,
        functionName: "addStrategy",
        args: [strategyAddr, parseInt(allocation)],
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("Strategy Added!", { id: toastId });
      setStrategyAddr("");
    } catch (e: any) {
      toast.error(e?.shortMessage || "Failed to Add Strategy", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleRebalance = async () => {
    setLoading(true);
    const toastId = toast.loading("Rebalancing Vault...");
    try {
      const tx = await writeContract(config, {
        address: vaultAddress,
        abi: BASE_VAULT_ABI,
        functionName: "rebalance",
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("Vault Rebalanced!", { id: toastId });
    } catch (e: any) {
      toast.error(e?.shortMessage || "Rebalance Failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel bg-[#16181D]/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Settings className="w-6 h-6 text-orange-400" />
          Vault Management
        </h2>

        {/* Vault Selector */}
        <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
          {(["low", "mid", "high"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveTab(v)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === v ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Add Strategy */}
        <div className="space-y-4">
          <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">
            Add Strategy
          </label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Strategy Address (0x...)"
              value={strategyAddr}
              onChange={(e) => setStrategyAddr(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:ring-1 focus:ring-orange-500"
            />
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Alloc (BPS)"
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
                className="w-32 bg-black/20 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:ring-1 focus:ring-orange-500"
              />
              <span className="text-xs text-gray-500">
                Basis Points (1000 = 10%)
              </span>
            </div>
          </div>
          <button
            onClick={handleAddStrategy}
            disabled={loading || !strategyAddr}
            className="w-full py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-xl font-bold transition-all"
          >
            {loading ? "..." : "Add Strategy"}
          </button>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">
            Maintenance
          </label>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Current Vault:</span>
              <span className="font-mono text-white bg-black/40 px-2 py-1 rounded">
                {vaultAddress?.slice(0, 6)}...{vaultAddress?.slice(-4)}
              </span>
            </div>
            <button
              onClick={handleRebalance}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Rebalance Vault
            </button>
            <p className="text-[10px] text-gray-500 text-center leading-relaxed">
              Rebalancing will harvest all strategies, withdraw assets, and
              redistribute according to new allocations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
