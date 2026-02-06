import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAccount } from "wagmi";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Zap,
  Flame,
  PieChart as PieChartIcon,
  Layers,
  ArrowRight,
  Activity,
  Gift,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
import { Link } from "react-router-dom";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { config } from "@/config/wagmiConfig";
import VAULT_ROUTER_ABI from "@/abi/VaultRouter.json";
import BASE_VAULT_ABI from "@/abi/BaseVault.json";
import {
  PieChart,
  Pie as PieOriginal,
  Cell,
  Tooltip as RechartsTooltip,
  Sector,
} from "recharts";

const VAULT_ROUTER = import.meta.env.VITE_VAULT_ROUTER_ADDRESS as `0x${string}`;
const ARC_CHAIN_ID = 5042002;

const LOW_VAULT = import.meta.env.VITE_LOW_RISK_VAULT as `0x${string}`;
const MED_VAULT = import.meta.env.VITE_MEDIUM_RISK_VAULT as `0x${string}`;
const HIGH_VAULT = import.meta.env.VITE_HIGH_RISK_VAULT as `0x${string}`;

interface Position {
  vault: string;
  type: "low" | "medium" | "high";
  deposited: number;
  currentValue: number;
  shares: bigint;
  apy: number;
  profit: number;
  profitPercent: number;
  depositDate: string;
  icon: any;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
  strategies: number;
}

const Pie = PieOriginal as any;

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;

  const data = payload[0].payload;
  return (
    <div className="glass-panel px-4 py-3 rounded-xl border border-white/10 bg-[#0f111a]/95 backdrop-blur-xl shadow-2xl min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <p className="text-white font-medium text-sm">{data.name}</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-gray-400">Value</span>
          <span className="text-sm font-mono font-bold text-white">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            }).format(data.value)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-gray-400">Weight</span>
          <span className="text-xs font-mono text-gray-300">
            {(data.percent * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 16}
        fill={fill}
        fillOpacity={0.4}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 2}
        fill={fill}
        fillOpacity={0.8}
      />
    </g>
  );
};

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [activeIndex, setActiveIndex] = useState(0);
  const isFirstFetch = useRef(true);

  const [baseData, setBaseData] = useState({
    low: { value: 0, deposited: 0, shares: 0n, apy: 0, strategies: 0 },
    med: { value: 0, deposited: 0, shares: 0n, apy: 0, strategies: 0 },
    high: { value: 0, deposited: 0, shares: 0n, apy: 0, strategies: 0 },
    depositTimestamp: 0,
  });

  const [displayData, setDisplayData] = useState({
    totalValue: 0,
    totalDeposited: 0,
    totalProfit: 0,
    totalProfitPercent: 0,
    weightedAPY: 0,
    positions: [] as Position[],
  });

  const fetchPortfolioData = useCallback(async () => {
    if (!address) return;
    if (isFirstFetch.current) setLoading(true);

    try {
      const [
        position,
        userPosDetails,
        apys,
        ,
        lowStrats,
        medStrats,
        highStrats,
      ] = (await Promise.all([
        readContract(config, {
          address: VAULT_ROUTER,
          abi: VAULT_ROUTER_ABI,
          functionName: "getUserPosition",
          args: [address],
          chainId: ARC_CHAIN_ID,
        }),
        readContract(config, {
          address: VAULT_ROUTER,
          abi: VAULT_ROUTER_ABI,
          functionName: "userPositions",
          args: [address],
          chainId: ARC_CHAIN_ID,
        }),
        readContract(config, {
          address: VAULT_ROUTER,
          abi: VAULT_ROUTER_ABI,
          functionName: "getVaultAPYs",
          chainId: ARC_CHAIN_ID,
        }),
        readContract(config, {
          address: VAULT_ROUTER,
          abi: VAULT_ROUTER_ABI,
          functionName: "getProtocolStats",
          chainId: ARC_CHAIN_ID,
        }),
        readContract(config, {
          address: LOW_VAULT,
          abi: BASE_VAULT_ABI,
          functionName: "getAllStrategies",
          chainId: ARC_CHAIN_ID,
        }),
        readContract(config, {
          address: MED_VAULT,
          abi: BASE_VAULT_ABI,
          functionName: "getAllStrategies",
          chainId: ARC_CHAIN_ID,
        }),
        readContract(config, {
          address: HIGH_VAULT,
          abi: BASE_VAULT_ABI,
          functionName: "getAllStrategies",
          chainId: ARC_CHAIN_ID,
        }),
      ])) as any[];

      const [
        lowShares,
        medShares,
        highShares,
        lowValRaw,
        medValRaw,
        highValRaw,
        totalValRaw,
        totalDepRaw,
      ] = position;

      const lowVal = parseFloat(formatUnits(lowValRaw, 6));
      const medVal = parseFloat(formatUnits(medValRaw, 6));
      const highVal = parseFloat(formatUnits(highValRaw, 6));
      const totalVal = parseFloat(formatUnits(totalValRaw, 6));
      const totalDep = parseFloat(formatUnits(totalDepRaw, 6));

      const lowPrice = totalVal > 0 ? lowVal / totalVal : 0;
      const medPrice = totalVal > 0 ? medVal / totalVal : 0;
      const highPrice = totalVal > 0 ? highVal / totalVal : 0;

      setBaseData({
        low: {
          value: lowVal,
          deposited: totalDep * lowPrice,
          shares: lowShares,
          apy: Number(apys[0]) / 100,
          strategies: lowStrats.filter((s: any) => s.allocationBps > 0).length,
        },
        med: {
          value: medVal,
          deposited: totalDep * medPrice,
          shares: medShares,
          apy: Number(apys[1]) / 100,
          strategies: medStrats.filter((s: any) => s.allocationBps > 0).length,
        },
        high: {
          value: highVal,
          deposited: totalDep * highPrice,
          shares: highShares,
          apy: Number(apys[2]) / 100,
          strategies: highStrats.filter((s: any) => s.allocationBps > 0).length,
        },
        depositTimestamp: Number(userPosDetails[4]),
      });

      setLastUpdate(Date.now());
      setLoading(false);
      isFirstFetch.current = false;
    } catch (err) {
      console.error("Portfolio fetch failed:", err);
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) {
      fetchPortfolioData();
      const interval = setInterval(fetchPortfolioData, 15000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchPortfolioData]);

  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      const seconds = (Date.now() - lastUpdate) / 1000;
      const calcGrowth = (val: number, apy: number) =>
        val + val * (apy / 100) * (seconds / (365 * 24 * 60 * 60));

      const curLow = calcGrowth(baseData.low.value, baseData.low.apy);
      const curMed = calcGrowth(baseData.med.value, baseData.med.apy);
      const curHigh = calcGrowth(baseData.high.value, baseData.high.apy);

      const totalV = curLow + curMed + curHigh;
      const totalD =
        baseData.low.deposited +
        baseData.med.deposited +
        baseData.high.deposited;
      const weightedA =
        totalV > 0
          ? (baseData.low.apy * curLow +
              baseData.med.apy * curMed +
              baseData.high.apy * curHigh) /
            totalV
          : 0;

      const depositDate =
        baseData.depositTimestamp > 0
          ? new Date(baseData.depositTimestamp * 1000).toLocaleDateString()
          : "Pending";

      const pos: Position[] = [];
      if (baseData.low.shares > 0n) {
        pos.push({
          vault: "Conservative",
          type: "low",
          deposited: baseData.low.deposited,
          currentValue: curLow,
          shares: baseData.low.shares,
          apy: baseData.low.apy,
          profit: curLow - baseData.low.deposited,
          profitPercent:
            baseData.low.deposited > 0
              ? ((curLow - baseData.low.deposited) / baseData.low.deposited) *
                100
              : 0,
          depositDate,
          icon: Shield,
          color: "#10b981",
          gradientFrom: "from-emerald-500/20",
          gradientTo: "to-emerald-500/5",
          description: "Low-risk stablecoin farming",
          strategies: baseData.low.strategies,
        });
      }
      if (baseData.med.shares > 0n) {
        pos.push({
          vault: "Balanced",
          type: "medium",
          deposited: baseData.med.deposited,
          currentValue: curMed,
          shares: baseData.med.shares,
          apy: baseData.med.apy,
          profit: curMed - baseData.med.deposited,
          profitPercent:
            baseData.med.deposited > 0
              ? ((curMed - baseData.med.deposited) / baseData.med.deposited) *
                100
              : 0,
          depositDate,
          icon: Zap,
          color: "#f59e0b",
          gradientFrom: "from-amber-500/20",
          gradientTo: "to-amber-500/5",
          description: "Diversified yield harvesting",
          strategies: baseData.med.strategies,
        });
      }
      if (baseData.high.shares > 0n) {
        pos.push({
          vault: "Aggressive",
          type: "high",
          deposited: baseData.high.deposited,
          currentValue: curHigh,
          shares: baseData.high.shares,
          apy: baseData.high.apy,
          profit: curHigh - baseData.high.deposited,
          profitPercent:
            baseData.high.deposited > 0
              ? ((curHigh - baseData.high.deposited) /
                  baseData.high.deposited) *
                100
              : 0,
          depositDate,
          icon: Flame,
          color: "#ef4444",
          gradientFrom: "from-rose-500/20",
          gradientTo: "to-rose-500/5",
          description: "High-yield opportunistic pools",
          strategies: baseData.high.strategies,
        });
      }

      setDisplayData({
        totalValue: totalV,
        totalDeposited: totalD,
        weightedAPY: weightedA,
        totalProfit: totalV - totalD,
        totalProfitPercent: totalD > 0 ? ((totalV - totalD) / totalD) * 100 : 0,
        positions: pos,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [baseData, lastUpdate, loading]);

  const handleHarvest = async () => {
    if (!address) return;
    setActionLoading(true);
    const toastId = toast.loading("Harvesting yield...");
    try {
      const tx = await writeContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "harvestAll",
        account: address,
        gas: 5_000_000n,
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("Harvested successfully!", { id: toastId });
      fetchPortfolioData();
    } catch (err: any) {
      toast.error("Harvest failed: " + (err.message || "Unknown error"), {
        id: toastId,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRebalance = async () => {
    if (!address) return;
    setActionLoading(true);
    const toastId = toast.loading("Rebalancing portfolio...");
    try {
      const tx = await writeContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "rebalance",
        account: address,
        gas: 5_000_000n,
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("Rebalance successful!", { id: toastId });
      fetchPortfolioData();
    } catch (err: any) {
      toast.error("Rebalance failed: " + (err.message || "Unknown error"), {
        id: toastId,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = useCallback(
    (val: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val),
    [],
  );

  const pieData = useMemo(
    () =>
      displayData.positions.map((p) => ({
        name: p.vault,
        value: p.currentValue,
        color: p.color,
        percent:
          displayData.totalValue > 0
            ? p.currentValue / displayData.totalValue
            : 0,
      })),
    [displayData],
  );

  if (!isConnected) {
    return (
      <DefaultLayout>
        <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-6">
          <div className="glass-panel p-12 rounded-3xl border border-white/5 flex flex-col items-center max-w-md text-center">
            <div className="w-20 h-20 rounded-full bg-[#135bec]/10 flex items-center justify-center mb-8 text-[#135bec]">
              <Wallet size={40} />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white">
              Connect Wallet
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Please connect your wallet to view your yield performance.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold tracking-widest">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Disconnected
            </div>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="flex flex-col lg:flex-row min-h-screen relative overflow-hidden font-sans">
        {/* LEFT PANEL: Summary & Visuals */}
        <section className="flex-1 bg-[#0B0C10] flex flex-col justify-center items-center relative p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/5">
          {/* Subtle radial background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(19,91,236,0.05),transparent_50%)] pointer-events-none" />

          <div className="w-full pt-8 max-w-xl flex flex-col gap-8 z-0 relative">
            {/* Header */}
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white mb-2">
                Portfolio
              </h1>
              <p className="text-gray-400 text-lg">
                Your performance analytics & allocation
              </p>
            </div>

            {/* Portfolio Value - Big Number Style */}
            <div className="relative py-8">
              <div className="flex items-center gap-2 text-gray-500 mb-2 font-medium uppercase tracking-widest text-xs">
                <Wallet className="w-4 h-4 text-[#135bec]" />
                Total Balance
              </div>

              {loading ? (
                <div className="h-20 w-64 bg-white/5 rounded-xl animate-pulse my-2" />
              ) : (
                <div className="flex flex-col">
                  <h2 className="text-6xl sm:text-7xl font-bold font-mono tracking-tighter text-white">
                    {formatCurrency(displayData.totalValue)}
                  </h2>
                  <div className="flex items-center gap-3 mt-4">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        displayData.totalProfit >= 0
                          ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
                          : "bg-rose-400/10 border-rose-400/20 text-rose-400"
                      }`}
                    >
                      {displayData.totalProfit >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {displayData.totalProfit >= 0 ? "+" : ""}
                      {formatCurrency(displayData.totalProfit)}
                    </div>
                    <span className="text-sm font-mono text-gray-500">
                      ({displayData.totalProfitPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}
              {/* Visual placeholder watermark */}
              <div className="absolute top-0 right-0 opacity-20 pointer-events-none">
                <Activity className="w-48 h-48 text-white/5 -rotate-12" />
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
                  Principal
                </p>
                <p className="text-xl font-mono font-bold text-white">
                  {formatCurrency(displayData.totalDeposited)}
                </p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
                  Net APY
                </p>
                <p className="text-xl font-mono font-bold text-emerald-400">
                  {displayData.weightedAPY.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Pie Chart Section - Simplified */}
            <div className="bg-[#16181D] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center group transition-colors hover:bg-black/40">
              <h3 className="w-full flex items-center gap-2 text-white font-bold text-sm mb-4">
                <PieChartIcon className="w-4 h-4 text-[#135bec]" />
                Risk Allocation
              </h3>

              <div className="h-[250px] w-full relative flex items-center justify-center">
                {loading ? (
                  <div className="w-12 h-12 rounded-full border-4 border-[#135bec]/20 border-t-[#135bec] animate-spin" />
                ) : pieData.length > 0 ? (
                  <div className="relative">
                    <PieChart width={240} height={240}>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        onMouseEnter={(_: any, index: number) =>
                          setActiveIndex(index)
                        }
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="rgba(0,0,0,0.5)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                    {/* Centered Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white leading-none">
                          {pieData.length}
                        </p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                          Pos
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center opacity-40">
                    <PieChartIcon className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-xs text-gray-500">Empty</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Details & Actions */}
        <section className="flex-1 bg-[#16181D] flex flex-col justify-center items-center relative p-8 lg:p-12">
          {/* Background decoration */}
          <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

          <div className="w-full max-w-xl flex flex-col gap-8 z-0 relative">
            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleHarvest}
                disabled={actionLoading || loading}
                className="relative group bg-gradient-to-br from-emerald-500/10 to-emerald-900/5 hover:from-emerald-500/20 hover:to-emerald-900/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-5 transition-all text-left disabled:opacity-50"
              >
                <div className="mb-3 p-2 bg-emerald-500/20 w-fit rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                  <Gift size={20} />
                </div>
                <h3 className="text-white font-bold text-lg">Harvest</h3>
                <p className="text-sm text-gray-400">Claim yield</p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                  <ArrowRight className="w-5 h-5 text-emerald-400" />
                </div>
              </button>

              <button
                onClick={handleRebalance}
                disabled={actionLoading || loading}
                className="relative group bg-gradient-to-br from-[#135bec]/10 to-blue-900/5 hover:from-[#135bec]/20 hover:to-blue-900/10 border border-[#135bec]/20 hover:border-[#135bec]/40 rounded-2xl p-5 transition-all text-left disabled:opacity-50"
              >
                <div className="mb-3 p-2 bg-[#135bec]/20 w-fit rounded-lg text-[#135bec] group-hover:scale-110 transition-transform">
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-white font-bold text-lg">Rebalance</h3>
                <p className="text-sm text-gray-400">Optimize risk</p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                  <ArrowRight className="w-5 h-5 text-[#135bec]" />
                </div>
              </button>
            </div>

            {/* Active Positions List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-[#135bec]" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  Active Positions
                </h3>
              </div>

              {loading ? (
                [0, 1].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-black/20 border border-white/10 p-6 h-32 animate-pulse flex flex-col justify-center"
                  >
                    <div className="flex gap-4 items-center mb-4">
                      <div className="w-12 h-12 bg-white/5 rounded-xl" />
                      <div className="space-y-2">
                        <div className="w-24 h-4 bg-white/5 rounded" />
                        <div className="w-16 h-3 bg-white/5 rounded" />
                      </div>
                    </div>
                  </div>
                ))
              ) : displayData.positions.length > 0 ? (
                displayData.positions.map((pos, idx) => (
                  <div
                    key={`${pos.type}-${idx}`}
                    className="relative rounded-2xl bg-black/20 border border-white/10 p-6 transition-all duration-300 hover:bg-black/30 hover:border-white/20 group"
                  >
                    <div
                      className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${pos.gradientFrom} rounded-l-2xl`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pl-2">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl bg-white/5 border border-white/5 flex-shrink-0 ${pos.profit >= 0 ? "text-white" : "text-rose-400"}`}
                        >
                          <pos.icon
                            className="w-6 h-6"
                            style={{ color: pos.color }}
                          />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">
                            {pos.vault}
                          </h4>
                          <p className="text-xs text-gray-500 mb-1">
                            {pos.description}
                          </p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            APY {pos.apy.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                          Balance
                        </p>
                        <p className="text-xl font-mono font-bold text-white mb-1">
                          {formatCurrency(pos.currentValue)}
                        </p>
                        <span
                          className={`text-xs font-medium ${pos.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {pos.profit >= 0 ? "+" : ""}
                          {formatCurrency(pos.profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-black/20 border border-dashed border-white/10 p-12 flex flex-col items-center justify-center text-center">
                  <p className="text-gray-500 text-sm mb-4">
                    No active positions found.
                  </p>
                  <Link
                    to="/vault"
                    className="text-[#135bec] hover:text-white text-sm font-bold flex items-center gap-1 transition-colors"
                  >
                    Deploy Capital <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </DefaultLayout>
  );
}
