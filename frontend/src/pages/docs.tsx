import DefaultLayout from "@/layouts/default";
import {
  ArrowRight,
  Shield,
  Zap,
  Flame,
  FileText,
  GitBranch,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  TrendingUp,
  PieChart,
  Coins,
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
                    risk-adjusted strategies. The system architecture is
                    modular, separating user interaction (Router), asset
                    management (Vaults), and yield execution (Strategies). This
                    separation of concerns ensures that the protocol is both
                    highly secure and easily extensible to new DeFi
                    opportunities.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                      <Shield className="w-8 h-8 text-green-400 mb-2" />
                      <h3 className="text-lg font-bold text-white mb-2">
                        Low Risk Tier
                      </h3>
                      <p className="text-sm text-gray-400">
                        Focuses on capital preservation and high-liquidity
                        lending. Targeting 5-7% APY through stablecoin lending
                        on Aave and delta-neutral market making.
                      </p>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                      <Zap className="w-8 h-8 text-yellow-400 mb-2" />
                      <h3 className="text-lg font-bold text-white mb-2">
                        Medium Risk Tier
                      </h3>
                      <p className="text-sm text-gray-400">
                        Balances growth and safety. Targeting 10-15% APY using
                        Liquid Staking Tokens (LSTs) like stETH/rETH and stable
                        liquidity provision on Curve/Uniswap.
                      </p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <Flame className="w-8 h-8 text-red-400 mb-2" />
                      <h3 className="text-lg font-bold text-white mb-2">
                        High Risk Tier
                      </h3>
                      <p className="text-sm text-gray-400">
                        Aggressive yield harvesting. Targeting 20-100% APY via
                        leveraged yield farming, emerging chain opportunities,
                        and recursive lending strategies.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
                    <h4 className="text-white font-semibold mb-3">
                      Core Pillars of AuraVault
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#135bec] mt-1.5 shrink-0" />
                        <p>
                          <span className="text-white">ERC-4626 Standard:</span>{" "}
                          Every vault follows the unified tokenized vault
                          standard, ensuring compatibility with the entire DeFi
                          ecosystem.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#135bec] mt-1.5 shrink-0" />
                        <p>
                          <span className="text-white">Non-Custodial:</span> At
                          no point does the AuraVault team have control over
                          user funds. Controls are strictly limited to strategy
                          allocation.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#135bec] mt-1.5 shrink-0" />
                        <p>
                          <span className="text-white">AI Optimization:</span>{" "}
                          Allocations aren't static; they are updated by AI
                          models that analyze market sentiment and protocol
                          health.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#135bec] mt-1.5 shrink-0" />
                        <p>
                          <span className="text-white">Gas Efficiency:</span> By
                          batching rebalances and using the Nitrolite protocol,
                          we minimize the gas overhead passed to users.
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    Each vault contains 3 active strategies with dynamic
                    allocation based on performance and risk metrics.
                  </p>
                </div>
              </div>
            </section>

            {/* Deposit Flow */}
            <section id="deposit" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#135bec]/10">
                    <ArrowDownCircle className="w-6 h-6 text-[#135bec]" />
                  </div>
                  Deposit Flow
                </h2>
                <div className="space-y-6 text-gray-300">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-4">
                      <p>
                        Depositing into AuraVault is a seamless process managed
                        by our{" "}
                        <code className="text-[#135bec] bg-[#135bec]/10 px-2 py-0.5 rounded">
                          VaultRouter
                        </code>
                        . This contract acts as a central coordinator, ensuring
                        that single-click deposits are correctly fragmented
                        across the protocol based on your risk profile.
                      </p>
                      <ul className="list-disc list-inside space-y-3 ml-4">
                        <li>
                          <span className="text-white font-semibold">
                            NFT Verification:
                          </span>{" "}
                          The router checks your{" "}
                          <span className="text-[#135bec]">RiskNFT</span>{" "}
                          balance. Without an NFT, you must first define your
                          profile.
                        </li>
                        <li>
                          <span className="text-white font-semibold">
                            Atomic Fragmentation:
                          </span>{" "}
                          Your deposit (e.g., 100 USDC) is split into three
                          parts (e.g., 30, 40, 30) within a single blockchain
                          transaction.
                        </li>
                        <li>
                          <span className="text-white font-semibold">
                            Multi-Vault Entry:
                          </span>{" "}
                          Funds enter the Low, Medium, and High risk vaults
                          simultaneously, minimizing entry friction and
                          slippage.
                        </li>
                        <li>
                          <span className="text-white font-semibold">
                            Tokenized Shares:
                          </span>{" "}
                          You receive individual share tokens from each vault.
                          These shares represent your claim on the underlying
                          assets and earned yield.
                        </li>
                      </ul>
                    </div>
                    <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-[#135bec] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(19,91,236,0.5)]">
                        <DollarSign className="text-white" />
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full border border-green-500/30">
                          Low Risk (30%)
                        </div>
                        <div className="bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-1 rounded-full border border-yellow-500/30">
                          Med Risk (40%)
                        </div>
                        <div className="bg-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded-full border border-red-500/30">
                          High Risk (30%)
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Router Logic Execution
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#135bec]/10 border-l-4 border-[#135bec] p-4 rounded-r-xl">
                    <p className="text-sm italic">
                      "By using the Router, users save up to 60% on gas fees
                      compared to depositing into each vault manually, while
                      ensuring their risk profile is strictly followed
                      on-chain."
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Yield Generation */}
            <section id="yield" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl text-white">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  Yield Generation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                      Yield generation in AuraVault is not about high-frequency
                      trading, but about{" "}
                      <span className="text-white">
                        smart liquidity placement
                      </span>
                      . Each vault is powered by 3-5 concurrent strategies that
                      are vetted for security and performance.
                    </p>
                    <p>
                      The protocol uses{" "}
                      <span className="text-green-400 font-semibold">
                        Lending
                      </span>{" "}
                      for baseline yield,
                      <span className="text-yellow-400 font-semibold">
                        Liquidity Provision (LP)
                      </span>{" "}
                      for volume-based fees, and{" "}
                      <span className="text-red-400 font-semibold">
                        Incentivized Mining
                      </span>{" "}
                      for aggressive growth.
                    </p>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm mt-4">
                      <h4 className="text-white mb-2 font-semibold">
                        Key Protocols Used:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Aave V3",
                          "Lido Finance",
                          "Curve Finance",
                          "Uniswap V3",
                          "Rocket Pool",
                          "Stargate",
                        ].map((p) => (
                          <span
                            key={p}
                            className="px-2 py-1 bg-white/5 rounded border border-white/10 text-gray-400"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#135bec]/5 border border-[#135bec]/20 rounded-xl p-6">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-[#135bec] mb-4">
                      Risk-Adjusted Asset Mix
                    </h4>
                    <div className="space-y-6">
                      {[
                        {
                          name: "Bluechip Lending",
                          val: 45,
                          desc: "Aave/Compound stable rates",
                        },
                        {
                          name: "LST Yield",
                          val: 35,
                          desc: "Liquid staking rewards (ETH/MATIC)",
                        },
                        {
                          name: "DEX Fees",
                          val: 20,
                          desc: "Uniswap/Curve trading volume",
                        },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-white">{item.name}</span>
                            <span className="text-[#135bec] font-bold">
                              {item.val}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-1">
                            <div
                              className="h-full bg-gradient-to-r from-[#135bec] to-blue-400"
                              style={{ width: `${item.val}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500">
                            {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Harvesting */}
            <section id="harvest" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <RefreshCw className="w-6 h-6 text-yellow-400" />
                  </div>
                  Harvesting
                </h2>
                <div className="space-y-4 text-gray-300">
                  <p>
                    Harvesting is the protocol's heartbeat. It ensures that
                    unrealized gains from external protocols are converted into
                    liquid assets and re-invested to achieve{" "}
                    <span className="text-white font-semibold">
                      maximum compounding efficiency
                    </span>
                    .
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        Execution Workflow
                      </h4>
                      <ol className="list-decimal list-inside space-y-4 ml-2 text-sm">
                        <li>
                          <span className="text-gray-300 font-semibold">
                            Reward Claiming:
                          </span>{" "}
                          The Keeper triggers `claimRewards()` on all active
                          strategy contracts.
                        </li>
                        <li>
                          <span className="text-gray-300 font-semibold">
                            Slippage-Safe Swaps:
                          </span>{" "}
                          Rewards (e.g., AAVE or CRV tokens) are swapped for the
                          base asset using decentralized aggregators like 1inch
                          or Uniswap.
                        </li>
                        <li>
                          <span className="text-gray-300 font-semibold">
                            Performance Fee:
                          </span>{" "}
                          A small percentage (typically 10-20% of profit) is
                          diverted to the protocol treasury to fund future
                          development.
                        </li>
                        <li>
                          <span className="text-gray-300 font-semibold">
                            Auto-Compounding:
                          </span>{" "}
                          The remaining assets are injected back into the
                          strategies, increasing the `pricePerShare` for all
                          vault depositors.
                        </li>
                      </ol>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                        <h5 className="text-yellow-400 text-xs font-bold uppercase mb-2">
                          Compounding Frequency
                        </h5>
                        <p className="text-sm">
                          Harvests are triggered every 1 to 6 hours depending on
                          the volatility and accumulated reward balance,
                          ensuring gas costs don't eat into the yield.
                        </p>
                      </div>
                      <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                        <h5 className="text-green-400 text-xs font-bold uppercase mb-2">
                          Yield Re-investment
                        </h5>
                        <p className="text-sm">
                          100% of non-fee rewards are re-invested. This
                          recursive deposit mechanism results in a significantly
                          higher APY over long durations due to compound
                          interest.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Rebalancing */}
            <section id="rebalance" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <GitBranch className="w-6 h-6 text-blue-400" />
                  </div>
                  Rebalancing (Powered by Nitrolite)
                </h2>
                <div className="space-y-6 text-gray-300">
                  <p>
                    Traditional rebalancing is expensive and slow. AuraVault
                    solves this using the{" "}
                    <span className="text-[#135bec] font-bold">
                      Nitrolite Protocol
                    </span>
                    , a hybrid state-signing framework that allows for rapid,
                    secure, and gas-efficient reallocations.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                    <div className="p-5 bg-purple-500/5 border border-purple-500/20 rounded-xl hover:bg-purple-500/10 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                          <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        <h4 className="text-white font-bold">
                          Off-Chain Computation
                        </h4>
                      </div>
                      <p className="text-sm text-gray-400 font-normal leading-relaxed">
                        Our Keeper service analyzes 1,000+ data points across
                        DeFi, computing the optimal allocation for each
                        strategy. The new state is signed as a{" "}
                        <span className="text-white underline decoration-[#135bec]">
                          Nitrolite Update
                        </span>
                        , which is valid but not yet on-chain.
                      </p>
                    </div>
                    <div className="p-5 bg-[#135bec]/5 border border-[#135bec]/20 rounded-xl hover:bg-[#135bec]/10 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-[#135bec]/20">
                          <Shield className="w-5 h-5 text-[#135bec]" />
                        </div>
                        <h4 className="text-white font-bold">
                          Cryptographic Settlement
                        </h4>
                      </div>
                      <p className="text-sm text-gray-400 font-normal leading-relaxed">
                        Signed updates are settled on-chain in batches. This
                        "checkpointing" mechanism reduces gas costs by
                        <span className="text-white font-semibold">
                          {" "}
                          up to 90%
                        </span>{" "}
                        while maintaining the full security of the underlying
                        blockchain.
                      </p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 border-dashed border-white/20">
                    <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-[#135bec]" />
                      AI-Decision Logic
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-2 rounded bg-white/5 border border-white/10">
                        <div className="text-[#135bec] font-bold text-lg leading-none">
                          APY
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase">
                          Historical Analysis
                        </div>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/10">
                        <div className="text-[#135bec] font-bold text-lg leading-none">
                          TVL
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase">
                          Liquidity Depth
                        </div>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/10">
                        <div className="text-[#135bec] font-bold text-lg leading-none">
                          Volatility
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase">
                          Price Deviation
                        </div>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/10">
                        <div className="text-[#135bec] font-bold text-lg leading-none">
                          Security
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase">
                          Contract Health
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Withdrawal */}
            <section id="withdraw" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <ArrowUpCircle className="w-6 h-6 text-orange-400" />
                  </div>
                  Withdrawal
                </h2>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Withdrawal is as critical as entry. AuraVault ensures that
                  users can redeem their shares for underlying assets
                  <span className="text-white italic">
                    {" "}
                    24/7 without lockups
                  </span>
                  . The system dynamically pulls liquidity from multiple
                  strategies to fulfill large withdrawal requests.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-4">
                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 hover:border-[#135bec]/30 transition-all">
                      <h4 className="text-white font-semibold flex items-center gap-2 mb-2 underline underline-offset-4 decoration-[#135bec]/50">
                        <ArrowUpCircle className="w-4 h-4 text-orange-400" />
                        The Exit Process
                      </h4>
                      <ul className="list-disc list-inside text-xs text-gray-400 space-y-2 ml-1">
                        <li>Shares are burned by the vault contract.</li>
                        <li>
                          Pro-rata share of all underlying assets is calculated.
                        </li>
                        <li>
                          The system attempts to fulfill from liquid reserves
                          first.
                        </li>
                        <li>
                          If reserves are low, it gracefully triggers
                          `withdraw()` on strategies.
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-xl">
                    <h5 className="text-white text-sm font-bold mb-3 uppercase tracking-wider">
                      Withdrawal Types
                    </h5>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-3 bg-white/5 rounded border border-white/10">
                        <span className="text-orange-400 font-bold block text-lg leading-snug">
                          0% Exit Fees
                        </span>
                        <span className="text-[10px] text-gray-500">
                          We believe in capital freedom. Withdraw anytime with
                          zero protocol exit fees.
                        </span>
                      </div>
                      <div className="p-3 bg-white/5 rounded border border-white/10">
                        <span className="text-orange-400 font-bold block text-lg leading-snug">
                          Instant Liquidity
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Subject to underlying protocol liquidity. Standard
                          USDC withdrawals are processed instantly.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Risk Profiles */}
            <section id="risk" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <PieChart className="w-6 h-6 text-pink-400" />
                  </div>
                  Risk Profiles & The RiskNFT
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-4 text-gray-300 leading-relaxed">
                    <p>
                      Your Risk Profile is more than just a setting; it's a{" "}
                      <span className="text-white font-semibold">
                        blockchain-native identity
                      </span>
                      . Upon completing the onboarding survey, the protocol
                      mints a non-transferable{" "}
                      <span className="text-pink-400">RiskNFT</span> to your
                      wallet.
                    </p>
                    <p>
                      This NFT stores your specific allocation ratios (
                      <span className="text-green-400">lowPct</span>,{" "}
                      <span className="text-yellow-400">medPct</span>,{" "}
                      <span className="text-red-400">highPct</span>). When the{" "}
                      <code className="text-[#135bec]">VaultRouter</code>{" "}
                      receives a deposit, it reads these values directly from
                      the NFT to determine the capital distribution.
                    </p>
                    <p className="text-sm bg-[#135bec]/10 p-3 rounded-lg border-l-2 border-[#135bec]/30">
                      <strong>Pro-tip:</strong> You can update your risk profile
                      at any time by visiting your profile page. This will
                      update the data on your existing NFT, re-configuring all
                      future deposits instantly.
                    </p>
                  </div>
                  <div className="glass-panel p-6 flex flex-col items-center justify-center bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30">
                    <div className="w-24 h-32 bg-white/5 border-2 border-pink-500/50 rounded-2xl relative mb-4">
                      <div className="absolute inset-x-2 top-2 h-16 bg-gradient-to-br from-[#135bec] to-pink-500 rounded-lg opacity-80" />
                      <div className="absolute inset-x-2 bottom-4 h-1 bg-white/10 rounded" />
                      <div className="absolute inset-x-2 bottom-6 h-1 bg-white/10 rounded" />
                      <div className="absolute inset-x-2 bottom-8 h-1 bg-white/10 rounded" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-pink-400">
                      Risk Profile NFT
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1">
                      ID: #0824_X
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Smart Contracts Section */}
            <section id="contracts" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl text-white">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  System Smart Contracts
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">
                          Contract Name
                        </th>
                        <th className="px-4 py-3 font-semibold">Purpose</th>
                        <th className="px-4 py-3 font-semibold">Standard</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      <tr>
                        <td className="px-4 py-4 text-[#135bec] font-mono">
                          VaultRouter
                        </td>
                        <td className="px-4 py-4">
                          Entry point for deposits/withdrawals. Coordinates
                          multi-vault routing.
                        </td>
                        <td className="px-4 py-4">Custom</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 text-[#135bec] font-mono">
                          BaseVault
                        </td>
                        <td className="px-4 py-4">
                          The yield engine. Manages asset allocation to specific
                          strategies.
                        </td>
                        <td className="px-4 py-4">ERC-4626</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 text-[#135bec] font-mono">
                          VirtualUSDC
                        </td>
                        <td className="px-4 py-4">
                          The underlying yield-bearing asset for the protocol.
                        </td>
                        <td className="px-4 py-4">ERC-20</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 text-[#135bec] font-mono">
                          RiskNFT
                        </td>
                        <td className="px-4 py-4">
                          Stores user risk metadata and configuration.
                        </td>
                        <td className="px-4 py-4">ERC-721</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-6 text-xs text-gray-500">
                  All contracts are open-source and verified on Arc Explorer. We
                  recommend reviewing the source code for the most accurate
                  technical representation of the protocol logic.
                </p>
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
