import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  Clock,
  Shield,
  Zap,
  Flame,
  PieChart,
  Activity,
  DollarSign,
  Calendar,
  Target,
  BarChart3,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
import { Link } from "react-router-dom";
import { readContract } from "@wagmi/core";
import { formatUnits } from "viem";
import { config } from "@/config/wagmiConfig";
import VAULT_ROUTER_ABI from "@/abi/Router.json";
import BASE_VAULT_ABI from "@/abi/BaseVault.json";

const VAULT_ROUTER = import.meta.env.VITE_VAULT_ROUTER_ADDRESS as `0x${string}`;

// Helper to format numbers with commas and fixed decimals
const formatNumber = (val: string | number, decimals: number = 2) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

interface Position {
  vault: string;
  type: "low" | "medium" | "high";
  deposited: string;
  currentValue: string;
  shares: string;
  apy: string;
  profit: string;
  profitPercent: number;
  depositDate: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  totalHarvested: string;
  strategies: number;
}

interface VaultDetails {
  address: string;
  totalAssets: string;
  totalHarvested: string;
  lastHarvestTime: number;
  strategyCount: number;
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">(
    "30d",
  );

  const [portfolioData, setPortfolioData] = useState({
    totalValue: "0",
    totalDeposited: "0",
    profitLoss: "0",
    profitLossPercent: 0,
    positions: [] as Position[],
    weightedAPY: "0",
    totalHarvested: "0",
    depositTimestamp: 0,
  });

  const [vaultDetails, setVaultDetails] = useState<{
    low: VaultDetails | null;
    med: VaultDetails | null;
    high: VaultDetails | null;
  }>({
    low: null,
    med: null,
    high: null,
  });

  const [protocolStats, setProtocolStats] = useState({
    totalValueLocked: "0",
    lowVaultTVL: "0",
    medVaultTVL: "0",
    highVaultTVL: "0",
  });

  const fetchVaultDetails = useCallback(async (vaultAddress: string) => {
    try {
      const [totalAssets, totalHarvested, lastHarvestTime, strategies] =
        await Promise.all([
          readContract(config, {
            address: vaultAddress as `0x${string}`,
            abi: BASE_VAULT_ABI,
            functionName: "totalAssets",
          }) as Promise<bigint>,
          readContract(config, {
            address: vaultAddress as `0x${string}`,
            abi: BASE_VAULT_ABI,
            functionName: "totalHarvested",
          }) as Promise<bigint>,
          readContract(config, {
            address: vaultAddress as `0x${string}`,
            abi: BASE_VAULT_ABI,
            functionName: "lastHarvestTime",
          }) as Promise<bigint>,
          readContract(config, {
            address: vaultAddress as `0x${string}`,
            abi: BASE_VAULT_ABI,
            functionName: "getAllStrategies",
          }) as Promise<any[]>,
        ]);

      return {
        address: vaultAddress,
        totalAssets: formatUnits(totalAssets, 18),
        totalHarvested: formatUnits(totalHarvested, 18),
        lastHarvestTime: Number(lastHarvestTime),
        strategyCount: strategies.filter((s: any) => s.active).length,
      };
    } catch (err) {
      console.error("Error fetching vault details:", err);
      return null;
    }
  }, []);

  const fetchPortfolioData = useCallback(async () => {
    if (!address) return;

    try {
      // Fetch user position
      const position = (await readContract(config, {
        address: VAULT_ROUTER,
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

      const [
        lowShares,
        medShares,
        highShares,
        lowValue,
        medValue,
        highValue,
        totalValue,
        totalDeposited,
        profitLoss,
      ] = position;

      // Fetch user position details for timestamp
      const userPosDetails = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "userPositions",
        args: [address],
      })) as [bigint, bigint, bigint, bigint, bigint];

      const [, , , , depositTimestamp] = userPosDetails;

      // Fetch APYs
      const apys = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getVaultAPYs",
      })) as [bigint, bigint, bigint];

      const [lowAPY, medAPY, highAPY] = apys;

      // Fetch weighted APY for user
      const weightedAPY = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getUserEstimatedAPY",
        args: [address],
      })) as bigint;

      // Fetch vault addresses
      const vaults = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getVaults",
      })) as [string, string, string];

      const [lowVaultAddr, medVaultAddr, highVaultAddr] = vaults;

      // Fetch vault details
      const [lowDetails, medDetails, highDetails] = await Promise.all([
        fetchVaultDetails(lowVaultAddr),
        fetchVaultDetails(medVaultAddr),
        fetchVaultDetails(highVaultAddr),
      ]);

      setVaultDetails({
        low: lowDetails,
        med: medDetails,
        high: highDetails,
      });

      // Fetch protocol stats
      const stats = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getProtocolStats",
      })) as [bigint, bigint, bigint, bigint];

      const [totalValueLocked, lowVaultTVL, medVaultTVL, highVaultTVL] = stats;

      setProtocolStats({
        totalValueLocked: formatUnits(totalValueLocked, 18),
        lowVaultTVL: formatUnits(lowVaultTVL, 18),
        medVaultTVL: formatUnits(medVaultTVL, 18),
        highVaultTVL: formatUnits(highVaultTVL, 18),
      });

      const positions: Position[] = [];
      const depositDate = new Date(Number(depositTimestamp) * 1000)
        .toISOString()
        .split("T")[0];

      // Calculate individual vault profits
      const lowDeposited =
        Number(formatUnits(totalDeposited, 18)) *
        (lowShares > 0n
          ? Number(formatUnits(lowValue, 18)) /
            Number(formatUnits(totalValue, 18))
          : 0);
      const medDeposited =
        Number(formatUnits(totalDeposited, 18)) *
        (medShares > 0n
          ? Number(formatUnits(medValue, 18)) /
            Number(formatUnits(totalValue, 18))
          : 0);
      const highDeposited =
        Number(formatUnits(totalDeposited, 18)) *
        (highShares > 0n
          ? Number(formatUnits(highValue, 18)) /
            Number(formatUnits(totalValue, 18))
          : 0);

      if (lowShares > 0n) {
        const currentVal = Number(formatUnits(lowValue, 18));
        const profit = currentVal - lowDeposited;
        const profitPercent =
          lowDeposited > 0 ? (profit / lowDeposited) * 100 : 0;

        positions.push({
          vault: "Conservative Vault",
          type: "low",
          deposited: lowDeposited.toFixed(2),
          currentValue: formatUnits(lowValue, 18),
          shares: formatUnits(lowShares, 18),
          apy: (Number(lowAPY) / 100).toFixed(1),
          profit: profit.toFixed(2),
          profitPercent,
          depositDate,
          icon: Shield,
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
          totalHarvested: lowDetails?.totalHarvested || "0",
          strategies: lowDetails?.strategyCount || 0,
        });
      }

      if (medShares > 0n) {
        const currentVal = Number(formatUnits(medValue, 18));
        const profit = currentVal - medDeposited;
        const profitPercent =
          medDeposited > 0 ? (profit / medDeposited) * 100 : 0;

        positions.push({
          vault: "Balanced Vault",
          type: "medium",
          deposited: medDeposited.toFixed(2),
          currentValue: formatUnits(medValue, 18),
          shares: formatUnits(medShares, 18),
          apy: (Number(medAPY) / 100).toFixed(1),
          profit: profit.toFixed(2),
          profitPercent,
          depositDate,
          icon: Zap,
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          totalHarvested: medDetails?.totalHarvested || "0",
          strategies: medDetails?.strategyCount || 0,
        });
      }

      if (highShares > 0n) {
        const currentVal = Number(formatUnits(highValue, 18));
        const profit = currentVal - highDeposited;
        const profitPercent =
          highDeposited > 0 ? (profit / highDeposited) * 100 : 0;

        positions.push({
          vault: "Aggressive Vault",
          type: "high",
          deposited: highDeposited.toFixed(2),
          currentValue: formatUnits(highValue, 18),
          shares: formatUnits(highShares, 18),
          apy: (Number(highAPY) / 100).toFixed(1),
          profit: profit.toFixed(2),
          profitPercent,
          depositDate,
          icon: Flame,
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          totalHarvested: highDetails?.totalHarvested || "0",
          strategies: highDetails?.strategyCount || 0,
        });
      }

      const totalValNum = Number(formatUnits(totalValue, 18));
      const totalDepNum = Number(formatUnits(totalDeposited, 18));
      const plPercent =
        totalDepNum > 0 ? ((totalValNum - totalDepNum) / totalDepNum) * 100 : 0;

      // Calculate total harvested across all vaults
      const totalHarvested = (
        parseFloat(lowDetails?.totalHarvested || "0") +
        parseFloat(medDetails?.totalHarvested || "0") +
        parseFloat(highDetails?.totalHarvested || "0")
      ).toFixed(2);

      setPortfolioData({
        totalValue: formatUnits(totalValue, 18),
        totalDeposited: formatUnits(totalDeposited, 18),
        profitLoss: formatUnits(profitLoss, 18),
        profitLossPercent: plPercent,
        positions,
        weightedAPY: (Number(weightedAPY) / 100).toFixed(2),
        totalHarvested,
        depositTimestamp: Number(depositTimestamp),
      });
    } catch (err) {
      console.error("Error fetching portfolio data:", err);
    }
  }, [address, fetchVaultDetails]);

  useEffect(() => {
    if (isConnected) {
      fetchPortfolioData();
      const interval = setInterval(fetchPortfolioData, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchPortfolioData]);

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysHeld = (depositDate: string) => {
    const now = new Date();
    const deposit = new Date(depositDate);
    const diff = Math.floor(
      (now.getTime() - deposit.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  if (!isConnected) {
    return (
      <DefaultLayout>
        <div className="relative min-h-screen w-full bg-[#0B0C10] text-white flex items-center justify-center">
          <div className="glass-panel p-12 rounded-3xl text-center max-w-md">
            <Wallet className="w-16 h-16 text-[#135bec] mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">
              Please connect your wallet to view your portfolio
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  const isProfit = Number(portfolioData.profitLoss) >= 0;

  return (
    <DefaultLayout>
      <div className="relative min-h-screen w-full bg-[#0B0C10] text-white overflow-x-hidden">
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-[#135bec]/5 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-900/10 blur-[100px]" />
          <div className="bg-noise" />
        </div>

        {/* Main Content */}
        <main className="relative z-10 px-6 pt-32 pb-20">
          <div className="mx-auto w-full max-w-7xl">
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-12 bg-gradient-to-r from-[#135bec] to-transparent rounded-full" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#135bec]">
                  Your Portfolio
                </span>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <h1 className="text-5xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.05] text-white mb-2">
                    {formatCurrency(portfolioData.totalValue)}
                  </h1>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                        isProfit
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {isProfit ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-sm font-semibold">
                        {isProfit ? "+" : ""}
                        {formatCurrency(portfolioData.profitLoss)} (
                        {portfolioData.profitLossPercent.toFixed(2)}%)
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">All time</span>
                  </div>
                </div>

                {/* Timeframe Selector */}
                <div className="flex items-center gap-2 glass-panel p-1 rounded-xl">
                  {(["24h", "7d", "30d", "all"] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeframe === tf
                          ? "bg-[#135bec] text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-[#135bec]/10">
                    <DollarSign className="w-5 h-5 text-[#135bec]" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Total Deposited
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(portfolioData.totalDeposited)}
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <PieChart className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Active Positions
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {portfolioData.positions.length}
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Target className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Weighted APY
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {portfolioData.weightedAPY}%
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Activity className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Total Harvested
                  </span>
                </div>
                <p className={`text-2xl font-bold text-green-400`}>
                  {formatCurrency(portfolioData.totalHarvested)}
                </p>
              </div>
            </div>

            {/* Protocol Stats */}
            <div className="glass-panel p-6 rounded-2xl mb-12">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#135bec]" />
                Protocol Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Total Value Locked
                  </p>
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(protocolStats.totalValueLocked)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Low Risk TVL
                  </p>
                  <p className="text-xl font-bold text-green-400">
                    {formatCurrency(protocolStats.lowVaultTVL)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Med Risk TVL
                  </p>
                  <p className="text-xl font-bold text-yellow-400">
                    {formatCurrency(protocolStats.medVaultTVL)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    High Risk TVL
                  </p>
                  <p className="text-xl font-bold text-red-400">
                    {formatCurrency(protocolStats.highVaultTVL)}
                  </p>
                </div>
              </div>
            </div>

            {/* Positions */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                Your Positions
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {portfolioData.positions.length > 0 ? (
                  portfolioData.positions.map(
                    (position: Position, idx: number) => {
                      const Icon = position.icon;
                      const daysHeld = getDaysHeld(position.depositDate);
                      const posProfit = parseFloat(position.profit);
                      const isPosProfit = posProfit >= 0;

                      return (
                        <div
                          key={idx}
                          className={`glass-panel rounded-2xl p-6 border ${position.borderColor} hover:border-opacity-50 transition-all group cursor-pointer`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            {/* Left: Vault Info */}
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-3 rounded-xl ${position.bgColor}`}
                              >
                                <Icon className={`w-6 h-6 ${position.color}`} />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white mb-1">
                                  {position.vault}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {daysHeld} days held
                                  </span>
                                  <span>•</span>
                                  <span>{position.strategies} strategies</span>
                                </div>
                              </div>
                            </div>

                            {/* Center: Values */}
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 flex-1">
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                  Current Value
                                </p>
                                <p className="text-lg font-bold text-white">
                                  {formatCurrency(position.currentValue)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                  Deposited
                                </p>
                                <p className="text-lg font-bold text-gray-300">
                                  {formatCurrency(position.deposited)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                  Profit/Loss
                                </p>
                                <p
                                  className={`text-lg font-bold ${isPosProfit ? "text-green-400" : "text-red-400"}`}
                                >
                                  {isPosProfit ? "+" : ""}
                                  {formatCurrency(position.profit)}
                                </p>
                                <p
                                  className={`text-xs ${isPosProfit ? "text-green-400" : "text-red-400"}`}
                                >
                                  {position.profitPercent.toFixed(2)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                  APY
                                </p>
                                <p className="text-lg font-bold text-green-400">
                                  {position.apy}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                  Harvested
                                </p>
                                <p className="text-lg font-bold text-purple-400">
                                  {formatCurrency(position.totalHarvested)}
                                </p>
                              </div>
                            </div>

                            {/* Right: Action */}
                            <Link
                              to="/deposit"
                              className="glass-button px-6 py-3 rounded-xl flex items-center gap-2 group-hover:shadow-[0_0_20px_rgba(19,91,236,0.2)] transition-all"
                            >
                              <span className="text-sm font-semibold text-white">
                                Manage
                              </span>
                              <ArrowUpRight className="w-4 h-4 text-white/70" />
                            </Link>
                          </div>
                        </div>
                      );
                    },
                  )
                ) : (
                  <div className="glass-panel p-12 rounded-2xl text-center">
                    <PieChart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No active positions found.</p>
                    <Link
                      to="/deposit"
                      className="text-[#135bec] hover:underline mt-2 inline-block"
                    >
                      Make Your First Deposit
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/deposit"
                className="glass-panel p-6 rounded-2xl hover:border-[#135bec]/50 border border-transparent transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#135bec]/10">
                    <DollarSign className="w-6 h-6 text-[#135bec]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Deposit More
                    </h3>
                    <p className="text-sm text-gray-400">
                      Add funds to your vaults
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-600 group-hover:text-[#135bec] ml-auto transition-colors" />
                </div>
              </Link>

              <Link
                to="/profile"
                className="glass-panel p-6 rounded-2xl hover:border-purple-500/50 border border-transparent transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/10">
                    <Target className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Update Profile
                    </h3>
                    <p className="text-sm text-gray-400">
                      Adjust your risk tolerance
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 ml-auto transition-colors" />
                </div>
              </Link>

              <Link
                to="/docs"
                className="glass-panel p-6 rounded-2xl hover:border-green-500/50 border border-transparent transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <Activity className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Learn More
                    </h3>
                    <p className="text-sm text-gray-400">
                      Understand how it works
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 ml-auto transition-colors" />
                </div>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </DefaultLayout>
  );
}
