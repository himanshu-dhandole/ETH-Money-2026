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
  DollarSign,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
import { Link } from "react-router-dom";
import { readContract } from "@wagmi/core";
import { formatUnits } from "viem";
import { config } from "@/config/wagmiConfig";
import VAULT_ROUTER_ABI from "@/abi/VaultRouter.json";
import BASE_VAULT_ABI from "@/abi/BaseVault.json";
import {
  PieChart,
  Pie as PieOriginal,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  Sector,
} from "recharts";

const VAULT_ROUTER = import.meta.env.VITE_VAULT_ROUTER_ADDRESS as `0x${string}`;

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

interface VaultDetails {
  address: string;
  totalAssets: string;
  totalHarvested: string;
  lastHarvestTime: number;
  strategyCount: number;
}

// --- Components ---

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-panel px-4 py-3 rounded-xl border border-white/10 !bg-[#0f111a]/95 backdrop-blur-xl shadow-2xl min-w-[180px]">
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
            <span className="text-xs text-gray-400">Allocation</span>
            <span className="text-xs font-mono text-gray-300">
              {(data.percent * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Active Shape for Pie Chart interaction
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 12}
        fill={fill}
        fillOpacity={0.3}
      />
    </g>
  );
};

// Fix for Recharts TS error
const Pie = PieOriginal as any;

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [activeIndex, setActiveIndex] = useState(0);
  const isFirstFetch = useRef(true);

  // Base data fetched from contract
  const [baseData, setBaseData] = useState<{
    low: {
      value: number;
      deposited: number;
      shares: bigint;
      apy: number;
      strategies: number;
    };
    med: {
      value: number;
      deposited: number;
      shares: bigint;
      apy: number;
      strategies: number;
    };
    high: {
      value: number;
      deposited: number;
      shares: bigint;
      apy: number;
      strategies: number;
    };
    totalHarvested: number;
    depositTimestamp: number;
    profitLoss: number;
  }>({
    low: { value: 0, deposited: 0, shares: 0n, apy: 0, strategies: 0 },
    med: { value: 0, deposited: 0, shares: 0n, apy: 0, strategies: 0 },
    high: { value: 0, deposited: 0, shares: 0n, apy: 0, strategies: 0 },
    totalHarvested: 0,
    depositTimestamp: 0,
    profitLoss: 0,
  });

  const [displayData, setDisplayData] = useState<{
    totalValue: number;
    totalDeposited: number;
    totalProfit: number;
    totalProfitPercent: number;
    weightedAPY: number;
    positions: Position[];
  }>({
    totalValue: 0,
    totalDeposited: 0,
    totalProfit: 0,
    totalProfitPercent: 0,
    weightedAPY: 0,
    positions: [],
  });

  const [_vaultDetails, setVaultDetails] = useState<{
    low: VaultDetails | null;
    med: VaultDetails | null;
    high: VaultDetails | null;
  }>({
    low: null,
    med: null,
    high: null,
  });

  const [_protocolStats, setProtocolStats] = useState({
    totalValueLocked: "0",
    lowVaultTVL: "0",
    medVaultTVL: "0",
    highVaultTVL: "0",
  });

  // --- Data Fetching Logic ---

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
        totalAssets: formatUnits(totalAssets, 6), // 6 decimals for USDC
        totalHarvested: formatUnits(totalHarvested, 6), // 6 decimals
        lastHarvestTime: Number(lastHarvestTime),
        strategyCount: strategies.filter((s: any) => s.allocationBps > 0)
          .length, // Filter active using allocation
      };
    } catch (err) {
      console.error("Error fetching vault details for", vaultAddress, err);
      return null;
    }
  }, []);

  const fetchPortfolioData = useCallback(async () => {
    if (!address) return;

    // Show loading on first fetch
    if (isFirstFetch.current) {
      setLoading(true);
    }

    try {
      // 1. Fetch User Position (9 items in VaultRouter.json)
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
        lowValueVal,
        medValueVal,
        highValueVal,
        totalValueVal,
        totalDepositedVal,
        profitLossVal,
      ] = position;

      // 2. Fetch User Timestamp Details
      const userPosDetails = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "userPositions",
        args: [address],
      })) as [bigint, bigint, bigint, bigint, bigint];

      const depositTimestamp = Number(userPosDetails[4]);

      // 3. Fetch APYs
      const apys = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getVaultAPYs",
      })) as [bigint, bigint, bigint];

      const lowAPY = Number(apys[0]) / 100;
      const medAPY = Number(apys[1]) / 100;
      const highAPY = Number(apys[2]) / 100;

      // 4. Fetch Vault Addresses & Details
      const vaults = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getVaults",
      })) as [string, string, string];

      const [lowVaultAddr, medVaultAddr, highVaultAddr] = vaults;
      const [lowDetails, medDetails, highDetails] = await Promise.all([
        fetchVaultDetails(lowVaultAddr),
        fetchVaultDetails(medVaultAddr),
        fetchVaultDetails(highVaultAddr),
      ]);

      setVaultDetails({ low: lowDetails, med: medDetails, high: highDetails });

      // 5. Parse Values (using 6 decimals for USDC)
      const totalValNum = parseFloat(formatUnits(totalValueVal, 6));
      const totalDepNum = parseFloat(formatUnits(totalDepositedVal, 6));
      const profitLossNum = parseFloat(formatUnits(profitLossVal, 6));

      const lowValNum = parseFloat(formatUnits(lowValueVal, 6));
      const medValNum = parseFloat(formatUnits(medValueVal, 6));
      const highValNum = parseFloat(formatUnits(highValueVal, 6));

      // Estimate deposited amount per vault based on current value proportion (simplified)
      const safeTotalVal = totalValNum > 0 ? totalValNum : 1;
      const lowDepNum = totalDepNum * (lowValNum / safeTotalVal);
      const medDepNum = totalDepNum * (medValNum / safeTotalVal);
      const highDepNum = totalDepNum * (highValNum / safeTotalVal);

      setBaseData({
        low: {
          value: lowValNum,
          deposited: lowDepNum,
          shares: lowShares,
          apy: lowAPY,
          strategies: lowDetails?.strategyCount || 0,
        },
        med: {
          value: medValNum,
          deposited: medDepNum,
          shares: medShares,
          apy: medAPY,
          strategies: medDetails?.strategyCount || 0,
        },
        high: {
          value: highValNum,
          deposited: highDepNum,
          shares: highShares,
          apy: highAPY,
          strategies: highDetails?.strategyCount || 0,
        },
        totalHarvested:
          parseFloat(lowDetails?.totalHarvested || "0") +
          parseFloat(medDetails?.totalHarvested || "0") +
          parseFloat(highDetails?.totalHarvested || "0"),
        depositTimestamp: depositTimestamp,
        profitLoss: profitLossNum,
      });

      // 6. Protocol Stats
      const stats = (await readContract(config, {
        address: VAULT_ROUTER,
        abi: VAULT_ROUTER_ABI,
        functionName: "getProtocolStats",
      })) as [bigint, bigint, bigint, bigint];

      setProtocolStats({
        totalValueLocked: formatUnits(stats[0], 6), // 6 decimals
        lowVaultTVL: formatUnits(stats[1], 6),
        medVaultTVL: formatUnits(stats[2], 6),
        highVaultTVL: formatUnits(stats[3], 6),
      });

      setLastUpdate(Date.now());
      setLoading(false);
      isFirstFetch.current = false;
    } catch (err) {
      console.error("Error fetching portfolio data:", err);
      setLoading(false);
    }
  }, [address, fetchVaultDetails]);

  // Initial Fetch & Polling
  useEffect(() => {
    if (isConnected) {
      fetchPortfolioData();
      const interval = setInterval(fetchPortfolioData, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isConnected, fetchPortfolioData]);

  // Real-time Simulation Update
  useEffect(() => {
    // Return early if no active positions
    if (
      baseData.totalHarvested === 0 &&
      baseData.low.shares === 0n &&
      baseData.med.shares === 0n &&
      baseData.high.shares === 0n
    ) {
      // If loaded but no positions, ensure displayData is zeroed/consistent
      if (!loading) {
        setDisplayData((prev) => ({
          ...prev,
          positions: [],
          totalValue: 0,
          totalDeposited: 0,
          totalProfit: 0,
        }));
      }
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const timeDiffMs = now - lastUpdate;
      const secondsElapsed = timeDiffMs / 1000;

      // Simple continuous compound simulation between chain fetches
      const calculateCurrentValue = (baseVal: number, apy: number) => {
        if (baseVal === 0) return 0;
        const r = apy / 100;
        const growth = baseVal * r * (secondsElapsed / (365 * 24 * 60 * 60));
        return baseVal + growth;
      };

      const curLowVal = calculateCurrentValue(
        baseData.low.value,
        baseData.low.apy,
      );
      const curMedVal = calculateCurrentValue(
        baseData.med.value,
        baseData.med.apy,
      );
      const curHighVal = calculateCurrentValue(
        baseData.high.value,
        baseData.high.apy,
      );

      const totalVal = curLowVal + curMedVal + curHighVal;
      const totalDep =
        baseData.low.deposited +
        baseData.med.deposited +
        baseData.high.deposited;

      // Use the contract's profitLoss as base, add simulated growth
      // Contract Profit = Value - Deposited.
      // Simulated new Value - Deposited = new Profit.
      const totalProf = totalVal - totalDep;
      const totalProfPerc = totalDep > 0 ? (totalProf / totalDep) * 100 : 0;

      let newWeightedAPY = 0;
      if (totalVal > 0) {
        newWeightedAPY =
          baseData.low.apy * (curLowVal / totalVal) +
          baseData.med.apy * (curMedVal / totalVal) +
          baseData.high.apy * (curHighVal / totalVal);
      }

      const depositDate =
        baseData.depositTimestamp > 0
          ? new Date(baseData.depositTimestamp * 1000).toLocaleDateString()
          : "N/A";

      const newPositions: Position[] = [];

      if (baseData.low.shares > 0n) {
        newPositions.push({
          vault: "Conservative Vault",
          type: "low",
          deposited: baseData.low.deposited,
          currentValue: curLowVal,
          shares: baseData.low.shares,
          apy: baseData.low.apy,
          profit: curLowVal - baseData.low.deposited,
          profitPercent:
            baseData.low.deposited > 0
              ? ((curLowVal - baseData.low.deposited) /
                  baseData.low.deposited) *
                100
              : 0,
          depositDate,
          icon: Shield,
          color: "#4ade80",
          gradientFrom: "from-green-500/20",
          gradientTo: "to-green-500/5",
          description: "Stablecoin & Blue-chip yield farming",
          strategies: baseData.low.strategies,
        });
      }
      if (baseData.med.shares > 0n) {
        newPositions.push({
          vault: "Balanced Vault",
          type: "medium",
          deposited: baseData.med.deposited,
          currentValue: curMedVal,
          shares: baseData.med.shares,
          apy: baseData.med.apy,
          profit: curMedVal - baseData.med.deposited,
          profitPercent:
            baseData.med.deposited > 0
              ? ((curMedVal - baseData.med.deposited) /
                  baseData.med.deposited) *
                100
              : 0,
          depositDate,
          icon: Zap,
          color: "#facc15",
          gradientFrom: "from-yellow-500/20",
          gradientTo: "to-yellow-500/5",
          description: "LSDs & Curve Pools",
          strategies: baseData.med.strategies,
        });
      }
      if (baseData.high.shares > 0n) {
        newPositions.push({
          vault: "Aggressive Vault",
          type: "high",
          deposited: baseData.high.deposited,
          currentValue: curHighVal,
          shares: baseData.high.shares,
          apy: baseData.high.apy,
          profit: curHighVal - baseData.high.deposited,
          profitPercent:
            baseData.high.deposited > 0
              ? ((curHighVal - baseData.high.deposited) /
                  baseData.high.deposited) *
                100
              : 0,
          depositDate,
          icon: Flame,
          color: "#f87171",
          gradientFrom: "from-red-500/20",
          gradientTo: "to-red-500/5",
          description: "High yield pools & leveraged strategies",
          strategies: baseData.high.strategies,
        });
      }

      setDisplayData({
        totalValue: totalVal,
        totalDeposited: totalDep,
        totalProfit: totalProf,
        totalProfitPercent: totalProfPerc,
        weightedAPY: newWeightedAPY,
        positions: newPositions,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [baseData, lastUpdate, loading]); // Added loading to deps

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const pieData = useMemo(() => {
    return displayData.positions
      .map((p) => ({
        name: p.vault,
        value: p.currentValue,
        color: p.color,
        percent:
          displayData.totalValue > 0
            ? p.currentValue / displayData.totalValue
            : 0,
      }))
      .filter((d) => d.value > 0);
  }, [displayData]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (!isConnected) {
    return (
      <DefaultLayout>
        <div className="relative min-h-screen w-full bg-[#0B0C10] text-white flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-[#0B0C10]">
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#135bec]/10 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-900/10 blur-[120px]" />
            <div className="bg-noise absolute inset-0 opacity-20" />
          </div>
          <div className="glass-panel p-10 rounded-2xl flex flex-col items-center max-w-md w-full relative z-10 mx-4 border border-white/5">
            <div className="w-16 h-16 rounded-full bg-[#135bec]/20 flex items-center justify-center mb-6 text-[#135bec] animate-pulse">
              <Wallet size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
            <p className="text-gray-400 text-center mb-6 leading-relaxed text-sm">
              Connect your wallet to view your portfolio analytics, track
              performance, and manage your vault positions.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest font-semibold">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              Disconnected
            </div>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  const isProfit = displayData.totalProfit >= 0;

  return (
    <DefaultLayout>
      <div className="relative min-h-screen w-full bg-[#0B0C10] text-white font-sans overflow-x-hidden selection:bg-[#135bec]/30">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute -top-[10%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#135bec]/5 blur-[100px]" />
          <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-purple-900/5 blur-[100px]" />
          <div className="bg-noise absolute inset-0 opacity-30" />
        </div>

        <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-24 max-w-7xl">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white/90">
                Portfolio
              </h1>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column: Stats & Total */}
            <div className="lg:col-span-2 space-y-6">
              {/* Total Balance Card */}
              <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#135bec]/10 via-transparent to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />

                <div className="relative z-10">
                  <p className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#135bec]" />
                    Total Balance
                  </p>
                  {loading ? (
                    <div className="h-20 w-3/4 bg-white/5 animate-pulse rounded-2xl my-2" />
                  ) : (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-6">
                      <h2 className="text-5xl sm:text-6xl font-bold font-mono tracking-tighter text-white">
                        {formatCurrency(displayData.totalValue)}
                      </h2>
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-medium border ${
                          isProfit
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                        }`}
                      >
                        {isProfit ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isProfit ? "+" : ""}
                          {formatCurrency(displayData.totalProfit)}
                        </span>
                        <span className="opacity-70">
                          ({displayData.totalProfitPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Secondary Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-white/5">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                        In Vault
                      </p>
                      <p className="text-lg font-mono font-semibold text-gray-200">
                        {formatCurrency(displayData.totalDeposited)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                        Projected APY
                      </p>
                      <p className="text-lg font-mono font-semibold text-green-400">
                        {displayData.weightedAPY.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                        Total Profit Harvested
                      </p>
                      <p className="text-lg font-mono font-semibold text-yellow-400">
                        {formatCurrency(baseData.totalHarvested)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Positions List */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest flex items-center gap-2 pl-1">
                  <Layers className="w-4 h-4" /> Your Positions
                </h3>

                {loading ? (
                  [1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="glass-panel h-24 w-full animate-pulse rounded-2xl"
                    />
                  ))
                ) : displayData.positions.length > 0 ? (
                  displayData.positions.map((pos, idx) => (
                    <div
                      key={idx}
                      className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/15 transition-all duration-300 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Vault Info */}
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-xl bg-gradient-to-br ${pos.gradientFrom} ${pos.gradientTo} border border-white/5 group-hover:scale-110 transition-transform`}
                          >
                            <pos.icon
                              className={`w-6 h-6 ${pos.color.replace("#", "text-[") + "]"}`}
                              style={{ color: pos.color }}
                            />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white">
                              {pos.vault}
                            </h4>
                            <p className="text-xs text-gray-500 max-w-[200px] line-clamp-1">
                              {pos.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {/* <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/5">
                                {pos.strategies} Strategies
                              </span> */}
                              <span className="text-xs font-mono font-bold text-green-400">
                                APY: {pos.apy.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Value Info */}
                        <div className="flex flex-col sm:items-end">
                          <span className="text-2xl font-mono font-bold text-white tracking-tight">
                            {formatCurrency(pos.currentValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-panel p-8 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-3 text-gray-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <p className="text-gray-400 font-medium mb-1">
                      No Active Positions
                    </p>
                    <p className="text-gray-600 text-sm mb-4">
                      Deposit funds into a vault to start earning yield.
                    </p>
                    <Link
                      to="/"
                      className="text-xs font-bold text-[#135bec] hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider"
                    >
                      Explore Vaults <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Chart */}
            <div className="lg:col-span-1">
              <div className="glass-panel p-6 rounded-3xl border border-white/5 h-full min-h-[400px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />

                <div className="mb-6 relative z-10">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-[#135bec]" />{" "}
                    Allocation
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Breakdown by vault risk category
                  </p>
                </div>

                <div className="flex-1 min-h-[300px] relative">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 border-[#135bec] border-t-transparent animate-spin" />
                    </div>
                  ) : pieData.length > 0 ? (
                    <div className="flex items-center justify-center">
                      <PieChart width={300} height={300}>
                        {/* @ts-ignore */}
                        <Pie
                          data={pieData}
                          dataKey="value"
                          cx={150}
                          cy={150}
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={5}
                          activeIndex={activeIndex}
                          activeShape={renderActiveShape}
                          onMouseEnter={onPieEnter}
                        >
                          {pieData.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          content={(props) => {
                            const { payload } = props;
                            return (
                              <div className="flex flex-wrap justify-center gap-3 mt-4">
                                {payload?.map((entry: any, index: number) => (
                                  <div
                                    key={`item-${index}`}
                                    className="flex items-center gap-1.5"
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-xs text-gray-400 font-medium">
                                      {entry.payload?.value
                                        ? formatCurrency(entry.payload.value)
                                        : entry.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                      <div className="w-24 h-24 rounded-full border-2 border-gray-800/50 flex items-center justify-center mb-4">
                        <PieChartIcon className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No Data Available</p>
                    </div>
                  )}

                  {/* Center Text Overlay */}
                  {pieData.length > 0 && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-12">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                          Total
                        </span>
                        <span className="text-lg font-bold text-white font-mono block">
                          {pieData.length} Vaults
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-[#135bec] mt-0.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Your portfolio allocation is updated efficiently based on
                      the underlying strategy performance. Rebalance if
                      necessary.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DefaultLayout>
  );
}
