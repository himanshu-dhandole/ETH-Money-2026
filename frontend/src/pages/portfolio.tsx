import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
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



export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage(); // Hook for signing

  const handleRebalance = async (position: Position) => {
    if (!address) return;
    setActionLoading(true);
    try {
      const vaultIdMap = { low: 0, medium: 1, high: 2 };
      const vaultId = vaultIdMap[position.type];

      // 1. Sign the message
      const message = `Rebalance request for vault ${vaultId} at ${address}`;
      const signature = await signMessageAsync({ message });

      // 2. Send to backend API
      const response = await fetch("http://localhost:3001/api/user/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: address,
          vaultId: vaultId,
          signature: signature,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Rebalance queued! Position #${data.position}`);
      } else if (data.position) {
        toast.info(`Already queued at position #${data.position}`);
      } else {
        toast.error(data.error || "Failed to request rebalance");
      }
    } catch (error) {
      console.error("Rebalance error:", error);
      toast.error("Failed to sign request");
    } finally {
      setActionLoading(false);
    }
  };

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
    [displayData.positions.length],
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
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${displayData.totalProfit >= 0
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

            {/* Pie Chart Section - CoinDCX Style with Labels */}
            <div className="bg-[#16181D] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center group transition-colors hover:bg-black/40">
              <h3 className="w-full flex items-center gap-2 text-white font-bold text-sm mb-4">
                <PieChartIcon className="w-4 h-4 text-[#135bec]" />
                Risk Allocation
              </h3>

              <div className="h-[450px] w-full relative flex items-center justify-center overflow-visible">
                {loading ? (
                  <div className="w-12 h-12 rounded-full border-4 border-[#135bec]/20 border-t-[#135bec] animate-spin" />
                ) : pieData.length > 0 ? (
                  <svg width="100%" height="100%" viewBox="0 0 700 450" className="overflow-visible">
                    {(() => {
                      const centerX = 350;
                      const centerY = 225;
                      const radius = 110;
                      const innerRadius = 75;
                      let currentAngle = -90; // Start from top

                      return displayData.positions.map((pos, idx) => {
                        const percentage = displayData.totalValue > 0
                          ? (pos.currentValue / displayData.totalValue) * 100
                          : 0;
                        const sliceAngle = (percentage / 100) * 360;
                        const midAngle = currentAngle + sliceAngle / 2;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + sliceAngle;

                        const isHovered = activeIndex === idx;

                        // Dynamic label positioning based on slice angle
                        const labelDistance = 200;
                        const elbowDistance = radius + 35;

                        // Calculate if label should be on left or right
                        const isLeft = midAngle > 90 && midAngle < 270;
                        const textAlign = isLeft ? 'end' : 'start';

                        // Point 1: Edge of donut slice
                        const p1x = centerX + Math.cos((midAngle * Math.PI) / 180) * (radius + 5);
                        const p1y = centerY + Math.sin((midAngle * Math.PI) / 180) * (radius + 5);

                        // Point 2: Elbow point (diagonal from slice)
                        const p2x = centerX + Math.cos((midAngle * Math.PI) / 180) * elbowDistance;
                        const p2y = centerY + Math.sin((midAngle * Math.PI) / 180) * elbowDistance;

                        // Point 3: Horizontal line endpoint
                        const p3x = isLeft
                          ? centerX - labelDistance
                          : centerX + labelDistance;
                        const p3y = p2y;

                        // Label text position
                        const labelX = isLeft ? p3x - 15 : p3x + 15;
                        const labelY = p3y;

                        // Create SVG path for donut slice
                        const startOuterX = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
                        const startOuterY = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
                        const endOuterX = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
                        const endOuterY = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
                        const startInnerX = centerX + Math.cos((endAngle * Math.PI) / 180) * innerRadius;
                        const startInnerY = centerY + Math.sin((endAngle * Math.PI) / 180) * innerRadius;
                        const endInnerX = centerX + Math.cos((startAngle * Math.PI) / 180) * innerRadius;
                        const endInnerY = centerY + Math.sin((startAngle * Math.PI) / 180) * innerRadius;

                        const largeArc = sliceAngle > 180 ? 1 : 0;

                        const pathData = [
                          `M ${startOuterX} ${startOuterY}`,
                          `A ${radius} ${radius} 0 ${largeArc} 1 ${endOuterX} ${endOuterY}`,
                          `L ${startInnerX} ${startInnerY}`,
                          `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInnerX} ${endInnerY}`,
                          'Z'
                        ].join(' ');

                        const result = (
                          <g key={`slice-${idx}`}>
                            {/* Donut slice */}
                            <path
                              d={pathData}
                              fill={pos.color}
                              stroke="rgba(0,0,0,0.3)"
                              strokeWidth="2"
                              className="transition-all duration-300 cursor-pointer"
                              style={{
                                filter: isHovered ? 'brightness(1.2)' : 'none',
                                opacity: isHovered ? 1 : 0.95,
                              }}
                              onMouseEnter={() => setActiveIndex(idx)}
                              onMouseLeave={() => setActiveIndex(-1)}
                            />

                            {/* Only show everything on hover */}
                            {isHovered && (
                              <>
                                {/* Connector lines (L-shaped) */}
                                <g className="transition-opacity duration-300">
                                  {/* Line from slice edge to elbow */}
                                  <line
                                    x1={p1x}
                                    y1={p1y}
                                    x2={p2x}
                                    y2={p2y}
                                    stroke={pos.color}
                                    strokeWidth={2.5}
                                    className="transition-all duration-300"
                                  />

                                  {/* Horizontal line to label */}
                                  <line
                                    x1={p2x}
                                    y1={p2y}
                                    x2={p3x}
                                    y2={p3y}
                                    stroke={pos.color}
                                    strokeWidth={2.5}
                                    className="transition-all duration-300"
                                  />
                                </g>

                                {/* Percentage label */}
                                <text
                                  x={labelX}
                                  y={labelY - 40}
                                  textAnchor={textAlign}
                                  className="font-bold transition-all duration-300"
                                  fill={pos.color}
                                  style={{
                                    fontSize: '28px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {percentage.toFixed(0)}%
                                </text>

                                {/* Vault name */}
                                <text
                                  x={labelX}
                                  y={labelY - 12}
                                  textAnchor={textAlign}
                                  className="fill-white font-bold"
                                  style={{ fontSize: '16px' }}
                                >
                                  {pos.vault} Vault
                                </text>

                                {/* Amount */}
                                <text
                                  x={labelX}
                                  y={labelY + 8}
                                  textAnchor={textAlign}
                                  className="fill-white font-mono font-bold"
                                  style={{ fontSize: '14px' }}
                                >
                                  {formatCurrency(pos.currentValue)}
                                </text>

                                {/* APY */}
                                <text
                                  x={labelX}
                                  y={labelY + 26}
                                  textAnchor={textAlign}
                                  className="fill-gray-400"
                                  style={{ fontSize: '11px' }}
                                >
                                  APY: {pos.apy.toFixed(2)}%
                                </text>
                              </>
                            )}
                          </g>
                        );

                        currentAngle += sliceAngle;
                        return result;
                      });
                    })()}

                    {/* Center circle */}
                    <circle
                      cx="350"
                      cy="225"
                      r="60"
                      fill="#16181D"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />

                    {/* Center text - Number of vaults */}
                    <text
                      x="350"
                      y="220"
                      textAnchor="middle"
                      className="fill-white font-bold"
                      style={{ fontSize: '32px' }}
                    >
                      {displayData.positions.length}
                    </text>
                    <text
                      x="350"
                      y="240"
                      textAnchor="middle"
                      className="fill-gray-500 font-bold uppercase tracking-widest"
                      style={{ fontSize: '11px' }}
                    >
                      VAULTS
                    </text>
                  </svg>
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

                      <div className="flex flex-col items-end gap-3">
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

                        <button
                          onClick={() => handleRebalance(pos)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg bg-[#135bec]/10 text-[#135bec] hover:bg-[#135bec]/20 border border-[#135bec]/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          {actionLoading ? "Signing..." : "Rebalance"}
                          <Zap className="w-3 h-3 group-hover:text-white transition-colors" />
                        </button>
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
