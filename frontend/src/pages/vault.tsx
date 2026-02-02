import { useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Flame,
  ArrowRight,
  Lock,
  Unlock,
  Info,
  ChevronRight,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";

// Vault data structure
interface VaultData {
  id: string;
  name: string;
  riskLevel: "low" | "medium" | "high";
  apy: string;
  tvl: string;
  description: string;
  icon: any;
  color: string;
  bgGradient: string;
  strategies: string[];
  minDeposit: string;
  lockPeriod: string;
}

const VAULTS: VaultData[] = [
  {
    id: "low-risk",
    name: "Conservative Vault",
    riskLevel: "low",
    apy: "5.2",
    tvl: "$45.2M",
    description:
      "Stable returns with minimal volatility. Perfect for risk-averse investors.",
    icon: ShieldCheck,
    color: "text-green-400",
    bgGradient: "from-green-500/10 to-transparent",
    strategies: ["Stablecoin Yield", "Aave Bluechip", "Treasury Bonds"],
    minDeposit: "100 USDC",
    lockPeriod: "No lock",
  },
  {
    id: "medium-risk",
    name: "Balanced Vault",
    riskLevel: "medium",
    apy: "12.8",
    tvl: "$28.7M",
    description:
      "Balanced approach combining stability with growth opportunities.",
    icon: Zap,
    color: "text-yellow-400",
    bgGradient: "from-yellow-500/10 to-transparent",
    strategies: ["Lido Staking", "Curve Pools", "Lending Protocols"],
    minDeposit: "100 USDC",
    lockPeriod: "7 days",
  },
  {
    id: "high-risk",
    name: "Aggressive Vault",
    riskLevel: "high",
    apy: "42.5",
    tvl: "$8.9M",
    description: "Maximum returns for those who can handle high volatility.",
    icon: Flame,
    color: "text-red-400",
    bgGradient: "from-red-500/10 to-transparent",
    strategies: ["Meme Pools", "Leveraged Yield", "Emerging Opportunities"],
    minDeposit: "100 USDC",
    lockPeriod: "14 days",
  },
];

export default function VaultPage() {
  const [selectedVault, setSelectedVault] = useState<string | null>(null);

  const getRiskBadge = (risk: string) => {
    const badges = {
      low: {
        text: "Low Risk",
        color: "bg-green-500/10 text-green-400 border-green-500/20",
      },
      medium: {
        text: "Medium Risk",
        color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      },
      high: {
        text: "High Risk",
        color: "bg-red-500/10 text-red-400 border-red-500/20",
      },
    };
    return badges[risk as keyof typeof badges];
  };

  return (
    <DefaultLayout>
      <div className="relative min-h-screen w-full bg-[#0B0C10] text-white overflow-x-hidden">
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#135bec]/5 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-900/10 blur-[100px]" />
          <div className="bg-noise" />
        </div>

        {/* Main Content */}
        <main className="relative z-10 px-6 pt-32 pb-20">
          <div className="mx-auto w-full max-w-7xl">
            {/* Header Section */}
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-12 bg-gradient-to-r from-[#135bec] to-transparent rounded-full" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#135bec]">
                  Yield Vaults
                </span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1.05] text-white mb-4">
                Choose Your
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">
                  Risk Profile
                </span>
              </h1>
              <p className="text-lg text-gray-400 font-light max-w-2xl">
                Select a vault that matches your risk tolerance. Each vault
                employs different strategies to maximize returns while managing
                risk.
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-[#135bec]/10">
                    <TrendingUp className="w-5 h-5 text-[#135bec]" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Total TVL
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">$82.8M</p>
                <p className="text-xs text-green-400 mt-1">+12.4% this month</p>
              </div>

              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Lock className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Active Vaults
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">3</p>
                <p className="text-xs text-gray-500 mt-1">All operational</p>
              </div>

              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Unlock className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-400 uppercase tracking-wider">
                    Avg APY
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">20.2%</p>
                <p className="text-xs text-gray-500 mt-1">Across all vaults</p>
              </div>
            </div>

            {/* Vault Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {VAULTS.map((vault) => {
                const Icon = vault.icon;
                const badge = getRiskBadge(vault.riskLevel);
                const isSelected = selectedVault === vault.id;

                return (
                  <div
                    key={vault.id}
                    className={`relative group cursor-pointer transition-all duration-300 ${
                      isSelected ? "scale-105" : "hover:scale-102"
                    }`}
                    onClick={() => setSelectedVault(vault.id)}
                  >
                    {/* Card */}
                    <div
                      className={`glass-panel rounded-3xl p-8 h-full border transition-all duration-300 ${
                        isSelected
                          ? "border-[#135bec]/50 shadow-[0_0_40px_rgba(19,91,236,0.2)]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      {/* Gradient Background */}
                      <div
                        className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${vault.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                      />

                      <div className="relative z-10">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-3 rounded-xl bg-white/5 ${vault.color}`}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                {vault.name}
                              </h3>
                              <span
                                className={`text-xs px-2 py-1 rounded-full border ${badge.color} inline-block mt-1`}
                              >
                                {badge.text}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* APY Display */}
                        <div className="mb-6">
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold text-white">
                              {vault.apy}
                            </span>
                            <span className="text-2xl text-gray-400">%</span>
                          </div>
                          <p className="text-sm text-gray-500 uppercase tracking-wider mt-1">
                            Estimated APY
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-400 leading-relaxed mb-6">
                          {vault.description}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                              TVL
                            </p>
                            <p className="text-lg font-bold text-white">
                              {vault.tvl}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                              Min Deposit
                            </p>
                            <p className="text-lg font-bold text-white">
                              {vault.minDeposit}
                            </p>
                          </div>
                        </div>

                        {/* Strategies */}
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500 uppercase tracking-wider">
                              Active Strategies
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {vault.strategies.map((strategy, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-sm text-gray-400"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-[#135bec]" />
                                {strategy}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTA Button */}
                        <Link
                          to="/deposit"
                          className="glass-button w-full h-12 rounded-xl flex items-center justify-center gap-2 group/btn transition-all duration-300 hover:shadow-[0_0_20px_rgba(19,91,236,0.3)]"
                        >
                          <span className="text-sm font-semibold text-white">
                            Deposit Now
                          </span>
                          <ArrowRight className="w-4 h-4 text-white/70 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>

                        {/* Lock Period */}
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                          <Lock className="w-3 h-3" />
                          <span>Lock period: {vault.lockPeriod}</span>
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#135bec] flex items-center justify-center shadow-lg animate-pulse">
                        <ChevronRight className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom CTA */}
            <div className="mt-16 text-center">
              <div className="glass-panel rounded-2xl p-8 max-w-3xl mx-auto">
                <h3 className="text-2xl font-bold text-white mb-3">
                  Need help choosing a vault?
                </h3>
                <p className="text-gray-400 mb-6">
                  Take our risk assessment to get a personalized recommendation
                  based on your investment goals and risk tolerance.
                </p>
                <Link
                  to="/"
                  className="glass-button inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(19,91,236,0.3)]"
                >
                  <span className="text-sm font-semibold text-white">
                    Take Risk Assessment
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/70" />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DefaultLayout>
  );
}
