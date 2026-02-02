import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Shield,
  Zap,
  Flame,
  PieChart,
  Activity,
  DollarSign,
  Calendar,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
import { Link } from "react-router-dom";
import { readContract } from "@wagmi/core";
import { formatUnits } from "viem";
import { config } from "@/config/wagmiConfig";
import VAULT_ROUTER_ABI from "@/abi/VaultRouter.json";


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
}


// Mock data - replace with actual blockchain data
// Recent activity can be fetched from events, for now using placeholder logic
const RECENT_ACTIVITY = [
  {
    type: "deposit",
    vault: "Aggressive Vault",
    amount: "0",
    date: new Date().toISOString(),
    txHash: "0x...",
  },
];


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
  });

  const fetchPortfolioData = useCallback(async () => {
    if (!address) return;

    try {
      const position = await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getUserPosition",
        args: [address],
      }) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];

      const [
        lowShares, medShares, highShares,
        lowValue, medValue, highValue,
        totalValue, totalDeposited, profitLoss
      ] = position;

      const userPosDetails = await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "userPositions",
        args: [address],
      }) as [bigint, bigint, bigint, bigint, bigint];

      const [, , , , depositTimestamp] = userPosDetails;

      const apys = await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getVaultAPYs",
      }) as [bigint, bigint, bigint];

      const [lowAPY, medAPY, highAPY] = apys;

      const positions: Position[] = [];
      const depositDate = new Date(Number(depositTimestamp) * 1000).toISOString().split('T')[0];

      if (lowShares > 0n) {
        positions.push({

          vault: "Conservative Vault",
          type: "low",
          deposited: formatUnits(lowValue, 18), // Approximation
          currentValue: formatUnits(lowValue, 18),
          shares: formatUnits(lowShares, 18),
          apy: (Number(lowAPY) / 100).toFixed(1),
          profit: "0",
          profitPercent: Number(lowAPY) / 100,
          depositDate,
          icon: Shield,
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
        });
      }

      if (medShares > 0n) {
        positions.push({
          vault: "Balanced Vault",
          type: "medium",
          deposited: formatUnits(medValue, 18),
          currentValue: formatUnits(medValue, 18),
          shares: formatUnits(medShares, 18),
          apy: (Number(medAPY) / 100).toFixed(1),
          profit: "0",
          profitPercent: Number(medAPY) / 100,
          depositDate,
          icon: Zap,
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
        });
      }

      if (highShares > 0n) {
        positions.push({
          vault: "Aggressive Vault",
          type: "high",
          deposited: formatUnits(highValue, 18),
          currentValue: formatUnits(highValue, 18),
          shares: formatUnits(highShares, 18),
          apy: (Number(highAPY) / 100).toFixed(1),
          profit: "0",
          profitPercent: Number(highAPY) / 100,
          depositDate,
          icon: Flame,
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
        });
      }

      const totalValNum = Number(formatUnits(totalValue, 18));
      const totalDepNum = Number(formatUnits(totalDeposited, 18));
      const plPercent = totalDepNum > 0 ? ((totalValNum - totalDepNum) / totalDepNum) * 100 : 0;

      setPortfolioData({
        totalValue: formatUnits(totalValue, 18),
        totalDeposited: formatUnits(totalDeposited, 18),
        profitLoss: formatUnits(profitLoss, 18),
        profitLossPercent: plPercent,
        positions,
      });
    } catch (err) {
      console.error("Error fetching portfolio data:", err);
    }
  }, [address]);

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
                      className={`flex items-center gap-1 px-3 py-1 rounded-full ${isProfit
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
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeframe === tf
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
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
                    <Activity className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Avg APY
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {portfolioData.positions.length > 0
                    ? (portfolioData.positions.reduce((sum: number, p: Position) => sum + parseFloat(p.apy), 0) / portfolioData.positions.length).toFixed(1)
                    : "0.0"
                  }%
                </p>

              </div>


              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Total Earnings
                  </span>
                </div>
                <p className={`text-2xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                  {isProfit ? '+' : ''}{formatCurrency(portfolioData.profitLoss)}
                </p>
              </div>

            </div>

            {/* Positions */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                Your Positions
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {portfolioData.positions.length > 0 ? (
                  portfolioData.positions.map((position: Position, idx: number) => {
                    const Icon = position.icon;


                    const daysHeld = getDaysHeld(position.depositDate);

                    return (
                      <div
                        key={idx}
                        className={`glass-panel rounded-2xl p-6 border ${position.borderColor} hover:border-opacity-50 transition-all group cursor-pointer`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          {/* Left: Vault Info */}
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${position.bgColor}`}>
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
                                <span>{position.apy}% APY</span>
                              </div>
                            </div>
                          </div>

                          {/* Center: Values */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
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
                                Shares
                              </p>
                              <p className="text-lg font-bold text-white">
                                {formatNumber(position.shares)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                Estimated APY
                              </p>
                              <p className="text-lg font-bold text-green-400">
                                {position.apy}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                Risk Level
                              </p>
                              <p className={`text-lg font-bold uppercase ${position.color}`}>
                                {position.type}
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
                  })
                ) : (
                  <div className="glass-panel p-12 rounded-2xl text-center">
                    <PieChart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No active positions found.</p>
                    <Link to="/vault" className="text-[#135bec] hover:underline mt-2 inline-block">
                      Explore Vaults
                    </Link>
                  </div>
                )}
              </div>

            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Recent Activity
              </h2>
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex flex-col gap-4">
                  {RECENT_ACTIVITY.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-4 border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${activity.type === "deposit"
                              ? "bg-green-500/10"
                              : "bg-blue-500/10"
                            }`}
                        >
                          {activity.type === "deposit" ? (
                            <ArrowDownRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-semibold">
                            {activity.type === "deposit"
                              ? "Deposited"
                              : "Harvested"}
                          </p>
                          <p className="text-sm text-gray-400">
                            {activity.vault}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">
                          {activity.type === "deposit" ? "" : "+"}
                          {formatCurrency(activity.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(activity.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>
    </DefaultLayout>
  );
}
