import DefaultLayout from "@/layouts/default";
import {
  ArrowRight,
  Shield,
  Zap,
  Flame,
  TrendingUp,
  RefreshCw,
  Wallet,
  FileText,
  GitBranch,
  Clock,
  DollarSign,
  Target,
  Activity,
} from "lucide-react";

export default function DocsPage() {
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
          <div className="mx-auto w-full max-w-5xl">
            {/* Header */}
            <div className="mb-16 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="h-1 w-12 bg-gradient-to-r from-[#135bec] to-transparent rounded-full" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#135bec]">
                  Documentation
                </span>
                <div className="h-1 w-12 bg-gradient-to-l from-[#135bec] to-transparent rounded-full" />
              </div>
              <h1 className="text-5xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.05] text-white mb-4">
                How AuraVault Works
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                A comprehensive guide to understanding the yield generation and
                vault management system
              </p>
            </div>

            {/* Table of Contents */}
            <div className="glass-panel p-8 rounded-2xl mb-12">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#135bec]" />
                Table of Contents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "System Overview", href: "#overview" },
                  { title: "Deposit Flow", href: "#deposit" },
                  { title: "Yield Generation", href: "#yield" },
                  { title: "Harvesting", href: "#harvest" },
                  { title: "Rebalancing", href: "#rebalance" },
                  { title: "Withdrawal", href: "#withdraw" },
                  { title: "Risk Profiles", href: "#risk" },
                  { title: "Smart Contracts", href: "#contracts" },
                ].map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    className="flex items-center gap-2 text-gray-400 hover:text-[#135bec] transition-colors p-3 rounded-lg hover:bg-white/5"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>{item.title}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* System Overview */}
            <section id="overview" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#135bec]/10">
                    <GitBranch className="w-6 h-6 text-[#135bec]" />
                  </div>
                  System Overview
                </h2>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                  <p>
                    AuraVault is a sophisticated DeFi yield aggregation protocol
                    that automatically manages your assets across multiple
                    risk-adjusted strategies. The system consists of three main
                    vaults, each containing multiple strategies optimized for
                    different risk/reward profiles.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                      <Shield className="w-8 h-8 text-green-400 mb-2" />
                      <h3 className="text-lg font-bold text-white mb-2">
                        Low Risk Vault
                      </h3>
                      <p className="text-sm text-gray-400">
                        5-7% APY • Stablecoins, Aave, Bluechip strategies
                      </p>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                      <Zap className="w-8 h-8 text-yellow-400 mb-2" />
                      <h3 className="text-lg font-bold text-white mb-2">
                        Medium Risk Vault
                      </h3>
                      <p className="text-sm text-gray-400">
                        10-15% APY • Lido, rETH, Curve strategies
                      </p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <Flame className="w-8 h-8 text-red-400 mb-2" />
                      <h3 className="text-lg font-bold text-white mb-2">
                        High Risk Vault
                      </h3>
                      <p className="text-sm text-gray-400">
                        20-100% APY • Meme, Emerging, Leveraged strategies
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    Each vault contains 3 active strategies with dynamic
                    allocation based on performance and risk metrics.
                  </p>
                </div>
              </div>
            </section>

            {/* Continue with remaining sections... */}
            {/* Footer CTA */}
            <div className="glass-panel p-8 rounded-2xl text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to Start Earning?
              </h3>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                Now that you understand how AuraVault works, create your risk
                profile and make your first deposit to start earning yield.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/profile"
                  className="glass-button px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(19,91,236,0.3)] transition-all"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Create Profile</span>
                </a>
                <a
                  href="/deposit"
                  className="bg-[#135bec] px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#135bec]/90 transition-all font-semibold"
                >
                  <DollarSign className="w-5 h-5" />
                  <span>Start Depositing</span>
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DefaultLayout>
  );
}
