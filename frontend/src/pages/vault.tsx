import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Flame,
  Activity,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import DefaultLayout from "@/layouts/default";
import { readContract } from "@wagmi/core";
import { formatUnits } from "viem";
import { config } from "@/config/wagmiConfig";
import VAULT_ROUTER_ABI from "@/abi/VaultRouter.json";
import strategyPerformance from "@/lib/aura-farmer.strategy_performance.json";

const VAULT_ROUTER = import.meta.env.VITE_VAULT_ROUTER_ADDRESS as `0x${string}`;

// Helper to format numbers
const formatNumber = (val: string | number, decimals: number = 2) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// Vault Definitions
interface VaultDefinition {
  id: string;
  name: string;
  riskLevel: "low" | "medium" | "high";
  tier: number;
  description: string;
  icon: any;
  color: string;
  hex: string;
  bgGradient: string;
  strategies: string[];
  minDeposit: string;
  lockPeriod: string;
}

const VAULTS: VaultDefinition[] = [
  {
    id: "low-risk",
    name: "Conservative",
    riskLevel: "low",
    tier: 0,
    description: "Stable returns with minimal volatility.",
    icon: ShieldCheck,
    color: "text-emerald-400",
    hex: "#34d399",
    bgGradient: "from-emerald-500/10 to-transparent",
    strategies: ["Stablecoin Yield", "Aave Bluechip", "Treasury Bonds"],
    minDeposit: "100 USDC",
    lockPeriod: "No lock",
  },
  {
    id: "medium-risk",
    name: "Balanced",
    riskLevel: "medium",
    tier: 1,
    description: "Growth & stability combined.",
    icon: Zap,
    color: "text-amber-400",
    hex: "#fbbf24",
    bgGradient: "from-amber-500/10 to-transparent",
    strategies: ["Lido Staking", "Curve Pools", "Lending Protocols"],
    minDeposit: "100 USDC",
    lockPeriod: "7 days",
  },
  {
    id: "high-risk",
    name: "Aggressive",
    riskLevel: "high",
    tier: 2,
    description: "Maximum returns with high volatility.",
    icon: Flame,
    color: "text-rose-500",
    hex: "#f43f5e",
    bgGradient: "from-rose-500/10 to-transparent",
    strategies: ["Meme Pools", "Leveraged Yield", "Emerging Opportunities"],
    minDeposit: "100 USDC",
    lockPeriod: "14 days",
  },
];

export default function VaultPage() {
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [vaultStats, setVaultStats] = useState({
    totalTVL: "0.00",
    avgAPY: "0.0",
    lowTVL: "0.00",
    medTVL: "0.00",
    highTVL: "0.00",
    lowAPY: "0.0",
    medAPY: "0.0",
    highAPY: "0.0",
  });

  // --- Contract Data Fetching ---
  const fetchVaultData = useCallback(async () => {
    try {
      const stats = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getProtocolStats",
      })) as [bigint, bigint, bigint, bigint];

      const [totalValueLocked, lowVaultTVL, medVaultTVL, highVaultTVL] = stats;

      const apys = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getVaultAPYs",
      })) as [bigint, bigint, bigint];

      const [lowAPY, medAPY, highAPY] = apys;

      const avg = (Number(lowAPY) + Number(medAPY) + Number(highAPY)) / 3 / 100;

      setVaultStats({
        totalTVL: formatUnits(totalValueLocked, 18),
        lowTVL: formatUnits(lowVaultTVL, 18),
        medTVL: formatUnits(medVaultTVL, 18),
        highTVL: formatUnits(highVaultTVL, 18),

        lowAPY: (Number(lowAPY) / 100).toFixed(1),
        medAPY: (Number(medAPY) / 100).toFixed(1),
        highAPY: (Number(highAPY) / 100).toFixed(1),
        avgAPY: avg.toFixed(1),
      });
    } catch (err) {
      console.error("Error fetching vault data:", err);
    }
  }, []);

  useEffect(() => {
    fetchVaultData();
    const interval = setInterval(fetchVaultData, 30000); // 30s update
    return () => clearInterval(interval);
  }, [fetchVaultData]);

  // --- Data Processing for Charts ---
  const chartData = useMemo(() => {
    // Group by date and track counts for averaging
    const dailyData: Record<
      string,
      {
        date: string;
        timestamp: number;
        low: number;
        medium: number;
        high: number;
        lowCount: number;
        mediumCount: number;
        highCount: number;
      }
    > = {};

    // Sort raw data
    // @ts-ignore - TS might complain about json typing
    const sortedRaw = [...strategyPerformance].sort(
      (a, b) =>
        new Date(a.timestamp.$date).getTime() -
        new Date(b.timestamp.$date).getTime(),
    );

    sortedRaw.forEach((item: any) => {
      const dateObj = new Date(item.timestamp.$date);
      const dateKey = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          timestamp: dateObj.getTime(),
          low: 0,
          medium: 0,
          high: 0,
          lowCount: 0,
          mediumCount: 0,
          highCount: 0,
        };
      }

      // Sum APY values and count strategies per tier to calculate average
      if (item.tier === 0) {
        dailyData[dateKey].low += item.apy;
        dailyData[dateKey].lowCount += 1;
      } else if (item.tier === 1) {
        dailyData[dateKey].medium += item.apy;
        dailyData[dateKey].mediumCount += 1;
      } else if (item.tier === 2) {
        dailyData[dateKey].high += item.apy;
        dailyData[dateKey].highCount += 1;
      }
    });

    // Calculate averages and return clean data
    return Object.values(dailyData).map((day) => ({
      date: day.date,
      timestamp: day.timestamp,
      low: day.lowCount > 0 ? day.low / day.lowCount : 0,
      medium: day.mediumCount > 0 ? day.medium / day.mediumCount : 0,
      high: day.highCount > 0 ? day.high / day.highCount : 0,
    }));
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#16181D] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-gray-400 text-xs mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300 text-sm capitalize">
                {entry.name}:
              </span>
              <span className="text-white font-bold text-sm">
                {entry.value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DefaultLayout>
      <div className="flex flex-col lg:flex-row min-h-screen relative overflow-hidden font-sans">
        {/* LEFT PANEL: Chart & Stats */}

        <section className="flex-1 bg-[#0B0C10] flex flex-col justify-center items-center relative p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/5">
          {/* Subtle radial background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(19,91,236,0.05),transparent_50%)] pointer-events-none" />

          <div className="w-full pt-8 max-w-3xl flex flex-col gap-8 z-0 relative">
            {/* Header */}
            <div className="space-y-4">
              {/* <div className="flex items-center gap-2">
                <span className="bg-[#135bec]/10 text-[#135bec] text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider border border-[#135bec]/20">
                  Live Performance
                </span>
              </div> */}

              <div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white mb-2">
                  Vault Analytics
                </h1>
                <p className="text-gray-400 text-lg">
                  Real-time performance across all three risk tiers
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                  Total Value Locked
                </p>
                <p className="text-3xl font-bold text-white">
                  ${formatNumber(vaultStats.totalTVL)}
                </p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                  Average APY
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-emerald-400">
                    {vaultStats.avgAPY}%
                  </p>
                  <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-[#16181D] border border-white/5 rounded-3xl p-6 md:p-8 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                <BarChart3 className="w-32 h-32" />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 relative z-10 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#135bec]" />
                    Historical Performance
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Net APY over the last 30 days
                  </p>
                </div>
                {/* Legend */}
                <div className="flex gap-3 flex-wrap">
                  {VAULTS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() =>
                        setSelectedVault((current) =>
                          current === v.id ? null : v.id,
                        )
                      }
                      className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                        selectedVault === v.id || selectedVault === null
                          ? `bg-white/10 border-white/20 text-white`
                          : "border-transparent text-gray-500 hover:text-gray-300 opacity-40"
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: v.hex }}
                      />
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[350px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="gradientLow"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#34d399"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#34d399"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="gradientMed"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#fbbf24"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#fbbf24"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="gradientHigh"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f43f5e"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f43f5e"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff10"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}%`}
                      dx={-10}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "#ffffff20" }}
                    />

                    <Area
                      type="monotone"
                      dataKey="low"
                      name="Conservative"
                      stroke="#34d399"
                      fill="url(#gradientLow)"
                      strokeWidth={2}
                      hide={
                        selectedVault !== null && selectedVault !== "low-risk"
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="medium"
                      name="Balanced"
                      stroke="#fbbf24"
                      fill="url(#gradientMed)"
                      strokeWidth={2}
                      hide={
                        selectedVault !== null &&
                        selectedVault !== "medium-risk"
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="high"
                      name="Aggressive"
                      stroke="#f43f5e"
                      fill="url(#gradientHigh)"
                      strokeWidth={2}
                      hide={
                        selectedVault !== null && selectedVault !== "high-risk"
                      }
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Vault Cards */}
        <section className="flex-1 bg-[#16181D] flex flex-col justify-center items-center relative p-8 lg:p-12">
          {/* Background decoration */}
          <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

          <div className="w-full max-w-2xl flex flex-col gap-6 z-0 relative">
            {/* Header */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                {/* <Sparkles className="w-5 h-5 text-[#135bec]" /> */}
                <h2 className="text-2xl font-bold text-white"></h2>
              </div>
              <p className="text-gray-400 text-sm"></p>
            </div>
            <div className="mt-4 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-[#135bec] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">
                    Smart Allocation
                  </h4>
                  <p className="text-gray-400 text-sm">
                    Your deposits are automatically allocated across multiple
                    strategies to optimize returns while managing risk.
                    Rebalance anytime to match your updated risk profile.
                  </p>
                </div>
              </div>
            </div>

            {/* Vault Cards */}
            <div className="space-y-4">
              {VAULTS.map((vault) => {
                const Icon = vault.icon;

                // Get dynamic stats
                const currentAPY =
                  vault.id === "low-risk"
                    ? vaultStats.lowAPY
                    : vault.id === "medium-risk"
                      ? vaultStats.medAPY
                      : vaultStats.highAPY;
                const currentTVL =
                  vault.id === "low-risk"
                    ? vaultStats.lowTVL
                    : vault.id === "medium-risk"
                      ? vaultStats.medTVL
                      : vaultStats.highTVL;

                return (
                  <div
                    key={vault.id}
                    className="relative rounded-2xl bg-black/20 border border-white/10 p-6 transition-all duration-300 hover:bg-black/30 hover:border-white/20 hover:translate-y-[-2px] group"
                  >
                    {/* Top Gradient Accent */}
                    <div
                      className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${vault.bgGradient.replace("to-transparent", "")} transition-all rounded-t-2xl`}
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Left: Icon & Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`p-3 rounded-xl bg-white/5 border border-white/5 ${vault.color} flex-shrink-0`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-white">
                              {vault.name}
                            </h3>
                            <div
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${vault.riskLevel === "low" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : vault.riskLevel === "medium" ? "border-amber-500/30 text-amber-400 bg-amber-500/10" : "border-rose-500/30 text-rose-400 bg-rose-500/10"}`}
                            >
                              {vault.riskLevel} Risk
                            </div>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">
                            {vault.description}
                          </p>

                          {/* Strategies */}
                          <div className="flex flex-wrap gap-2">
                            {vault.strategies.slice(0, 3).map((s, i) => (
                              <span
                                key={i}
                                className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md border border-white/5"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Stats & CTA */}

                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-gray-500 text-xs mb-1">APY</p>
                          <p className={`text-3xl font-bold ${vault.color}`}>
                            {currentAPY}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500 text-xs mb-1">TVL</p>
                          <p className="text-lg font-semibold text-white">
                            ${formatNumber(currentTVL, 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </DefaultLayout>
  );
}
