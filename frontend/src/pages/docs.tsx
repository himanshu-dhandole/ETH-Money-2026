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
  AlertCircle,
  CheckCircle,
  Globe,
  Layers,
  Code,
  Brain,
  Target,
  Users,
  Lock,
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
                  Complete Documentation
                </span>
                <div className="h-1 w-12 bg-gradient-to-l from-[#135bec] to-transparent rounded-full" />
              </div>
              <h1 className="text-5xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.05] text-white mb-4">
                Aura Protocol Documentation
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Personalized DeFi yield aggregation with AI-powered
                optimizations and seamless cross-chain deposits
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
                  { title: "The Problem & Solution", href: "#problem" },
                  { title: "Architecture Overview", href: "#architecture" },
                  { title: "Key Features", href: "#features" },
                  { title: "Circle CCTP Integration", href: "#cctp" },
                  { title: "User Experience Flow", href: "#ux" },
                  { title: "Deposit Process", href: "#deposit" },
                  { title: "Rebalancing System", href: "#rebalancing" },
                  { title: "AI-Powered Allocations", href: "#ai" },
                  { title: "Yield Generation", href: "#yield" },
                  { title: "Withdrawal Process", href: "#withdraw" },
                  { title: "Risk Profiles & NFT", href: "#risk" },
                  { title: "Smart Contracts", href: "#contracts" },
                  { title: "Getting Started", href: "#getting-started" },
                  { title: "Project Structure", href: "#structure" },
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

            {/* The Problem & Solution */}
            <section id="problem" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  The Problem
                </h2>
                <div className="space-y-4 text-gray-300 leading-relaxed mb-8">
                  <p>
                    Traditional DeFi yield aggregators suffer from critical
                    flaws, as painfully demonstrated by the Luna crash and
                    similar failures:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        One-Size-Fits-All
                      </h3>
                      <p className="text-sm text-gray-400">
                        Everyone gets the same strategy regardless of risk
                        tolerance, leading to suboptimal outcomes.
                      </p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        Random Liquidations
                      </h3>
                      <p className="text-sm text-gray-400">
                        Unexpected market events cause cascading failures and
                        total loss of capital.
                      </p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        Manual Rebalancing
                      </h3>
                      <p className="text-sm text-gray-400">
                        Users must constantly monitor and adjust positions
                        manually, requiring constant attention.
                      </p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        Gas-Intensive Operations
                      </h3>
                      <p className="text-sm text-gray-400">
                        Every rebalance costs significant gas fees, eating into
                        returns.
                      </p>
                    </div>
                  </div>
                  <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-xl">
                    <p className="text-sm font-semibold">
                      Result: Catastrophic losses (as seen in LUNA 2022 crash),
                      suboptimal returns, poor user experience, and barriers to
                      entry for non-technical users.
                    </p>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3 mt-12">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  The Solution
                </h2>
                <div className="space-y-6">
                  <p className="text-gray-300 leading-relaxed">
                    Aura Protocol introduces{" "}
                    <span className="text-white font-bold">
                      Personalized DeFi
                    </span>{" "}
                    through three revolutionary components:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-purple-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Soulbound Risk Profiles
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">
                        Users mint a non-transferable NFT that defines their
                        unique risk tolerance
                      </p>
                      <ul className="text-xs text-gray-400 space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                          <span>Conservative (Low Risk) - Stable yields</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
                          <span>Balanced (Medium) - Controlled growth</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                          <span>Aggressive (High) - Maximum returns</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-[#135bec]/5 border border-[#135bec]/20 rounded-xl p-5">
                      <div className="w-12 h-12 rounded-lg bg-[#135bec]/20 flex items-center justify-center mb-4">
                        <Brain className="w-6 h-6 text-[#135bec]" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        AI-Powered Allocation
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">
                        Intelligent backend continuously optimizes your
                        portfolio
                      </p>
                      <ul className="text-xs text-gray-400 space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-[#135bec] mt-0.5 shrink-0" />
                          <span>Monitors 9+ strategies in real-time</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-[#135bec] mt-0.5 shrink-0" />
                          <span>AI health checks via EIP-712 attestations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-[#135bec] mt-0.5 shrink-0" />
                          <span>Dynamic rebalancing via Nitrolite</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
                      <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Gas-Efficient Architecture
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">
                        Nitrolite Protocol for minimal on-chain overhead
                      </p>
                      <ul className="text-xs text-gray-400 space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                          <span>Off-chain state management</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                          <span>Batch operations for rebalancing</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                          <span>Realistic yield simulation system</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Architecture Overview */}
            <section id="architecture" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#135bec]/10">
                    <GitBranch className="w-6 h-6 text-[#135bec]" />
                  </div>
                  System Architecture
                </h2>
                <div className="space-y-6">
                  <p className="text-gray-300 leading-relaxed">
                    Aura Protocol's modular architecture separates user
                    interaction (Router), asset management (Vaults), and yield
                    execution (Strategies). This separation ensures both
                    security and extensibility.
                  </p>

                  <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex justify-center">
                      <img
                        src="https://cdn.phototourl.com/uploads/2026-02-07-82aba36e-9d8c-4908-9000-6204f2bee0bc.png"
                        alt="AuraVault System Architecture Diagram"
                        className="w-full max-w-4xl h-auto rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
                    <h4 className="text-white font-semibold mb-3">
                      Core Architectural Pillars
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#135bec] mt-1.5 shrink-0" />
                        <p>
                          <span className="text-white">ERC-4626 Standard:</span>{" "}
                          Every vault follows the unified tokenized vault
                          standard, ensuring DeFi ecosystem compatibility.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#135bec] mt-1.5 shrink-0" />
                        <p>
                          <span className="text-white">Non-Custodial:</span> The
                          Aura team never controls user funds. Controls are
                          limited to strategy allocation only.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#135bec] mt-1.5 shrink-0" />
                        <p>
                          <span className="text-white">AI Optimization:</span>{" "}
                          Allocations are dynamically updated by AI models
                          analyzing market sentiment and protocol health.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#135bec] mt-1.5 shrink-0" />
                        <p>
                          <span className="text-white">Gas Efficiency:</span>{" "}
                          Batched rebalances and Nitrolite Protocol minimize gas
                          overhead for users.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section id="features" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Target className="w-6 h-6 text-purple-400" />
                  </div>
                  Key Features
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Feature 1 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#135bec]/30 transition-all">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-purple-400" />
                      Personalized Risk Management
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Mint your unique soulbound NFT to define your exact risk
                      allocation across low, medium, and high-risk strategies.
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                      <code>{`riskNFT.mint(
  lowPct: 40,    // 40% low-risk
  medPct: 40,    // 40% medium-risk  
  highPct: 20    // 20% high-risk
);`}</code>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#135bec]/30 transition-all">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-400" />
                      Automated Rebalancing
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Set it and forget it with keeper-driven automation and
                      user-initiated flexibility.
                    </p>
                    <ul className="text-xs text-gray-400 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                        <span>
                          User-Initiated: Request rebalance anytime via API
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                        <span>Keeper-Driven: Automated every 10 minutes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                        <span>Harvest-on-Rebalance: Auto-collects yield</span>
                      </li>
                    </ul>
                  </div>

                  {/* Feature 3 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#135bec]/30 transition-all">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Nitrolite Integration
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Off-chain state management with cryptographic settlement
                      reduces gas costs dramatically.
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                      <code>{`// Off-chain: Sign update
const sig = await signer.sign({
  riskTier: 0,
  allocations: [33, 33, 34]
});

// On-chain: Settle when profitable
vault.settleRebalance(..., sig);`}</code>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#135bec]/30 transition-all">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-green-400" />
                      Realistic Yield Simulation
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      YieldReserve contract pre-funded with real Arc USDC for
                      transparent testing without token minting.
                    </p>
                    <ul className="text-xs text-gray-400 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                        <span>No artificial token minting</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                        <span>Strategies draw from real reserve</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                        <span>Transparent efficiency metrics</span>
                      </li>
                    </ul>
                  </div>

                  {/* Feature 5 */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#135bec]/30 transition-all md:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-[#135bec]" />
                      AI-Powered Allocations
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-[#135bec]/5 rounded-lg border border-[#135bec]/20">
                        <TrendingUp className="w-6 h-6 text-[#135bec] mx-auto mb-2" />
                        <div className="text-xs text-gray-400">
                          Dynamic Strategy Weighting
                        </div>
                      </div>
                      <div className="text-center p-3 bg-[#135bec]/5 rounded-lg border border-[#135bec]/20">
                        <PieChart className="w-6 h-6 text-[#135bec] mx-auto mb-2" />
                        <div className="text-xs text-gray-400">
                          Volatility-Adjusted Returns
                        </div>
                      </div>
                      <div className="text-center p-3 bg-[#135bec]/5 rounded-lg border border-[#135bec]/20">
                        <RefreshCw className="w-6 h-6 text-[#135bec] mx-auto mb-2" />
                        <div className="text-xs text-gray-400">
                          Adaptive Rebalancing
                        </div>
                      </div>
                      <div className="text-center p-3 bg-[#135bec]/5 rounded-lg border border-[#135bec]/20">
                        <Shield className="w-6 h-6 text-[#135bec] mx-auto mb-2" />
                        <div className="text-xs text-gray-400">
                          Health Monitoring
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Circle CCTP Integration */}
            <section id="cctp" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  Circle CCTP Gateway Integration
                </h2>
                <div className="space-y-6">
                  <p className="text-gray-300 leading-relaxed">
                    Built on Arc testnet (Arbitrum Orbit L3) with native Circle
                    CCTP support for seamless cross-chain USDC deposits from any
                    chain.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        How CCTP Works
                      </h3>
                      <ol className="space-y-3 text-sm text-gray-400">
                        <li className="flex gap-3">
                          <span className="text-blue-400 font-bold shrink-0">
                            1.
                          </span>
                          <span>
                            User initiates deposit from any CCTP-enabled chain
                            (Ethereum, Base, Optimism, Arbitrum)
                          </span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-blue-400 font-bold shrink-0">
                            2.
                          </span>
                          <span>Circle CCTP burns USDC on source chain</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-blue-400 font-bold shrink-0">
                            3.
                          </span>
                          <span>Native USDC minted on Arc testnet</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-blue-400 font-bold shrink-0">
                            4.
                          </span>
                          <span>
                            VaultRouter automatically distributes to
                            risk-appropriate vaults
                          </span>
                        </li>
                      </ol>
                    </div>

                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        UX Benefits
                      </h3>
                      <ul className="space-y-3 text-sm text-gray-400">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <span>
                            <span className="text-white font-semibold">
                              No Manual Bridging:
                            </span>{" "}
                            Deposit directly from your preferred chain
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <span>
                            <span className="text-white font-semibold">
                              No Wrapped Tokens:
                            </span>{" "}
                            Always native, canonical USDC
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <span>
                            <span className="text-white font-semibold">
                              No Arc Gas Required:
                            </span>{" "}
                            CCTP handles cross-chain transfer
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <span>
                            <span className="text-white font-semibold">
                              Instant Settlement:
                            </span>{" "}
                            Burn & mint ensures fast finality
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-[#135bec]/10 border-l-4 border-[#135bec] p-4 rounded-r-xl">
                    <p className="text-sm italic text-gray-300">
                      "Users never need to manually bridge or acquire Arc gas
                      tokens - deposit from any chain and start earning
                      immediately!"
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* User Experience Flow */}
            <section id="ux" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  User Experience Flow
                </h2>
                <div className="space-y-6">
                  <p className="text-gray-300 leading-relaxed">
                    From onboarding to earning, Aura Protocol provides a
                    seamless experience designed for both beginners and DeFi
                    veterans.
                  </p>

                  <div className="relative">
                    {/* Flow Steps */}
                    <div className="space-y-4">
                      {[
                        {
                          step: "1",
                          title: "Connect Wallet",
                          desc: "From any CCTP-enabled chain (Ethereum, Base, Optimism, Arbitrum)",
                          color: "blue",
                        },
                        {
                          step: "2",
                          title: "Complete Risk Assessment",
                          desc: "Answer a brief quiz to determine your risk tolerance",
                          color: "purple",
                        },
                        {
                          step: "3",
                          title: "Mint Soulbound Risk NFT",
                          desc: "Receive your personalized, non-transferable profile NFT",
                          color: "pink",
                        },
                        {
                          step: "4",
                          title: "Deposit USDC",
                          desc: "Via Circle CCTP from any supported chain - no manual bridging needed",
                          color: "green",
                        },
                        {
                          step: "5",
                          title: "Auto-allocation to Vaults",
                          desc: "Funds automatically distributed based on your risk profile",
                          color: "yellow",
                        },
                        {
                          step: "6",
                          title: "Earn Optimized Yield",
                          desc: "AI continuously optimizes your allocations for maximum returns",
                          color: "[#135bec]",
                        },
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-start">
                          <div
                            className={`w-12 h-12 rounded-lg bg-${item.color}-500/20 border border-${item.color}-500/30 flex items-center justify-center shrink-0`}
                          >
                            <span
                              className={`text-${item.color}-400 font-bold text-lg`}
                            >
                              {item.step}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-bold mb-1">
                              {item.title}
                            </h4>
                            <p className="text-sm text-gray-400">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dashboard Features */}
                  <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-bold mb-4">
                      Dashboard Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-semibold text-sm">
                            Real-time P&L Tracking
                          </div>
                          <div className="text-xs text-gray-400">
                            See current value vs. cost basis
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <PieChart className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-semibold text-sm">
                            APY Breakdown
                          </div>
                          <div className="text-xs text-gray-400">
                            Understand returns by risk tier
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Target className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-semibold text-sm">
                            Strategy Performance
                          </div>
                          <div className="text-xs text-gray-400">
                            Detailed metrics per strategy
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <RefreshCw className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-semibold text-sm">
                            One-Click Rebalancing
                          </div>
                          <div className="text-xs text-gray-400">
                            Update allocations anytime
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  Deposit Flow (with Circle CCTP)
                </h2>
                <div className="space-y-6 text-gray-300">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-4">
                      <p>
                        Depositing into Aura Protocol is seamless. Our{" "}
                        <code className="text-[#135bec] bg-[#135bec]/10 px-2 py-0.5 rounded">
                          VaultRouter
                        </code>{" "}
                        acts as a central coordinator, ensuring deposits are
                        correctly fragmented based on your risk profile.
                      </p>
                      <ul className="list-disc list-inside space-y-3 ml-4">
                        <li>
                          <span className="text-white font-semibold">
                            Cross-Chain Entry:
                          </span>{" "}
                          Deposit USDC from Ethereum, Base, Optimism, or
                          Arbitrum via Circle CCTP
                        </li>
                        <li>
                          <span className="text-white font-semibold">
                            NFT Verification:
                          </span>{" "}
                          Router checks your RiskNFT balance and reads your
                          allocation preferences
                        </li>
                        <li>
                          <span className="text-white font-semibold">
                            Atomic Fragmentation:
                          </span>{" "}
                          Your deposit splits into three parts within a single
                          transaction
                        </li>
                        <li>
                          <span className="text-white font-semibold">
                            Multi-Vault Entry:
                          </span>{" "}
                          Funds enter Low, Medium, and High risk vaults
                          simultaneously
                        </li>
                        <li>
                          <span className="text-white font-semibold">
                            Tokenized Shares:
                          </span>{" "}
                          Receive ERC-4626 share tokens representing your claim
                          on assets and yield
                        </li>
                      </ul>
                    </div>
                    <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-[#135bec] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(19,91,236,0.5)]">
                        <DollarSign className="text-white" />
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        Example: 1,000 USDC Deposit
                      </div>
                      <div className="space-y-2 mb-4 w-full">
                        <div className="bg-green-500/20 text-green-400 text-xs px-3 py-2 rounded-lg border border-green-500/30">
                          Low Risk Vault: 400 USDC (40%)
                        </div>
                        <div className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-2 rounded-lg border border-yellow-500/30">
                          Med Risk Vault: 400 USDC (40%)
                        </div>
                        <div className="bg-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg border border-red-500/30">
                          High Risk Vault: 200 USDC (20%)
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Router Logic Execution
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#135bec]/10 border-l-4 border-[#135bec] p-4 rounded-r-xl">
                    <p className="text-sm italic">
                      "By using Circle CCTP and the VaultRouter, users save up
                      to 60% on gas fees compared to manual deposits, while
                      never needing to acquire Arc testnet gas tokens!"
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Rebalancing System */}
            <section id="rebalancing" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <GitBranch className="w-6 h-6 text-blue-400" />
                  </div>
                  Rebalancing System (Powered by Nitrolite)
                </h2>
                <div className="space-y-6 text-gray-300">
                  <p>
                    Traditional rebalancing is expensive and slow. Aura Protocol
                    solves this using the{" "}
                    <span className="text-[#135bec] font-bold">
                      Nitrolite Protocol
                    </span>
                    , a hybrid state-signing framework for rapid, secure,
                    gas-efficient reallocations.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                        <Brain className="w-6 h-6 text-purple-400" />
                      </div>
                      <h4 className="text-white font-bold mb-2">
                        AI Analysis (Every 10 min)
                      </h4>
                      <ul className="text-xs text-gray-400 space-y-2">
                        <li>• Fetch current APYs from 9 strategies</li>
                        <li>• Calculate 7-day volatility</li>
                        <li>• Compute Sharpe ratios</li>
                        <li>• Generate optimal allocations</li>
                      </ul>
                    </div>

                    <div className="bg-[#135bec]/5 border border-[#135bec]/20 rounded-xl p-5">
                      <div className="w-12 h-12 rounded-lg bg-[#135bec]/20 flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-[#135bec]" />
                      </div>
                      <h4 className="text-white font-bold mb-2">
                        Off-Chain Computation
                      </h4>
                      <p className="text-xs text-gray-400">
                        Keeper analyzes 1,000+ data points and signs allocation
                        updates as{" "}
                        <span className="text-white">Nitrolite Updates</span> -
                        valid but not yet on-chain.
                      </p>
                    </div>

                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
                      <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6 text-green-400" />
                      </div>
                      <h4 className="text-white font-bold mb-2">
                        Cryptographic Settlement
                      </h4>
                      <p className="text-xs text-gray-400">
                        Signed updates settled on-chain in batches. Reduces gas
                        costs by{" "}
                        <span className="text-white font-bold">up to 90%</span>{" "}
                        while maintaining full security.
                      </p>
                    </div>
                  </div>

                  {/* Rebalancing Workflow */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h4 className="text-white font-semibold mb-4">
                      Complete Rebalancing Workflow
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-3">
                        <span className="text-[#135bec] font-bold shrink-0">
                          1.
                        </span>
                        <span>Withdraw from all current strategies</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-[#135bec] font-bold shrink-0">
                          2.
                        </span>
                        <span>
                          <span className="text-yellow-400 font-semibold">
                            Harvest yields first
                          </span>{" "}
                          - critical step to compound returns
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-[#135bec] font-bold shrink-0">
                          3.
                        </span>
                        <span>Reallocate per new AI-generated allocations</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-[#135bec] font-bold shrink-0">
                          4.
                        </span>
                        <span>Emit rebalance event for transparency</span>
                      </div>
                    </div>
                  </div>

                  {/* User-Initiated Rebalancing */}
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
                    <h4 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      User-Initiated Rebalancing
                    </h4>
                    <p className="text-sm text-gray-400 mb-3">
                      Users can request rebalancing anytime via API. The keeper
                      processes these in hourly batches.
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                      <code>{`curl -X POST http://api.aura/rebalance \\
  -d '{
    "userAddress": "0x...",
    "vaultId": 1,
    "signature": "0x..."
  }'`}</code>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* AI-Powered Allocations */}
            <section id="ai" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Brain className="w-6 h-6 text-purple-400" />
                  </div>
                  AI-Powered Allocations
                </h2>
                <div className="space-y-6">
                  <p className="text-gray-300 leading-relaxed">
                    Aura Protocol's AI engine continuously analyzes market
                    conditions and strategy performance to optimize your returns
                    while managing risk.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <TrendingUp className="w-8 h-8 text-[#135bec] mx-auto mb-2" />
                      <div className="text-white font-bold text-sm mb-1">
                        APY Analysis
                      </div>
                      <div className="text-xs text-gray-500">
                        Historical Performance
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <Layers className="w-8 h-8 text-[#135bec] mx-auto mb-2" />
                      <div className="text-white font-bold text-sm mb-1">
                        TVL Depth
                      </div>
                      <div className="text-xs text-gray-500">
                        Liquidity Assessment
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <RefreshCw className="w-8 h-8 text-[#135bec] mx-auto mb-2" />
                      <div className="text-white font-bold text-sm mb-1">
                        Volatility
                      </div>
                      <div className="text-xs text-gray-500">
                        Price Deviation
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <Shield className="w-8 h-8 text-[#135bec] mx-auto mb-2" />
                      <div className="text-white font-bold text-sm mb-1">
                        Security
                      </div>
                      <div className="text-xs text-gray-500">
                        Contract Health
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6">
                    <h3 className="text-white font-bold mb-4">
                      AI Capabilities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-semibold">
                            Dynamic Strategy Weighting
                          </div>
                          <div className="text-xs text-gray-400">
                            AI analyzes historical performance data
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-semibold">
                            Volatility-Adjusted Returns
                          </div>
                          <div className="text-xs text-gray-400">
                            Optimize via Sharpe ratios
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-semibold">
                            Adaptive Rebalancing
                          </div>
                          <div className="text-xs text-gray-400">
                            Frequency adjusts to market conditions
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-semibold">
                            Health Monitoring
                          </div>
                          <div className="text-xs text-gray-400">
                            Automatic alerts on underperformance
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#135bec]/10 border-l-4 border-[#135bec] p-4 rounded-r-xl">
                    <p className="text-sm">
                      <span className="text-white font-semibold">
                        EIP-712 Signed Attestations:
                      </span>{" "}
                      AI validates strategy safety and performance with
                      cryptographically signed health checks, ensuring
                      transparency and auditability.
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
                      Yield generation in Aura Protocol focuses on{" "}
                      <span className="text-white font-semibold">
                        smart liquidity placement
                      </span>{" "}
                      across vetted, secure strategies. Each vault manages 3-5
                      concurrent strategies.
                    </p>
                    <p>
                      The protocol uses{" "}
                      <span className="text-green-400 font-semibold">
                        Lending
                      </span>{" "}
                      for baseline yield,{" "}
                      <span className="text-yellow-400 font-semibold">
                        Liquidity Provision
                      </span>{" "}
                      for volume-based fees, and{" "}
                      <span className="text-red-400 font-semibold">
                        Incentivized Mining
                      </span>{" "}
                      for aggressive growth.
                    </p>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm mt-4">
                      <h4 className="text-white mb-3 font-semibold">
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
                            className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-gray-400 text-xs"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
                        <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <div className="text-white font-bold">Low Risk</div>
                        <div className="text-2xl font-bold text-green-400 my-2">
                          5-7%
                        </div>
                        <div className="text-xs text-gray-400">APY Target</div>
                      </div>
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-center">
                        <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <div className="text-white font-bold">Medium Risk</div>
                        <div className="text-2xl font-bold text-yellow-400 my-2">
                          10-15%
                        </div>
                        <div className="text-xs text-gray-400">APY Target</div>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
                        <Flame className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <div className="text-white font-bold">High Risk</div>
                        <div className="text-2xl font-bold text-red-400 my-2">
                          20-100%
                        </div>
                        <div className="text-xs text-gray-400">APY Target</div>
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

                {/* Harvesting Info */}
                <div className="mt-8 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    Automated Harvesting & Compounding
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h4 className="text-white font-semibold mb-2">
                        Harvest Frequency
                      </h4>
                      <p className="text-gray-400">
                        Triggered every 1-6 hours based on volatility and
                        accumulated rewards, ensuring gas costs don't erode
                        yield.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">
                        Compounding Strategy
                      </h4>
                      <p className="text-gray-400">
                        100% of non-fee rewards are re-invested. Performance
                        fees (10-20% of profit) fund protocol development.
                      </p>
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
                  Withdrawal Process
                </h2>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Withdrawal is as critical as entry. Aura Protocol ensures
                  users can redeem shares for underlying assets{" "}
                  <span className="text-white font-semibold italic">
                    24/7 without lockups
                  </span>
                  . The system dynamically pulls liquidity from multiple
                  strategies.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-4">
                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 hover:border-orange-500/30 transition-all">
                      <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                        <ArrowUpCircle className="w-4 h-4 text-orange-400" />
                        The Exit Process
                      </h4>
                      <ol className="space-y-2 text-sm text-gray-400">
                        <li className="flex gap-2">
                          <span className="text-orange-400 font-bold shrink-0">
                            1.
                          </span>
                          <span>Shares are burned by the vault contract</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-orange-400 font-bold shrink-0">
                            2.
                          </span>
                          <span>
                            Pro-rata share of underlying assets calculated
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-orange-400 font-bold shrink-0">
                            3.
                          </span>
                          <span>
                            System attempts to fulfill from liquid reserves
                            first
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-orange-400 font-bold shrink-0">
                            4.
                          </span>
                          <span>
                            If needed, gracefully triggers withdraw() on
                            strategies
                          </span>
                        </li>
                      </ol>
                    </div>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-xl">
                    <h5 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">
                      Withdrawal Features
                    </h5>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-white font-bold">
                            0% Exit Fees
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          We believe in capital freedom. Withdraw anytime with
                          zero protocol fees.
                        </span>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-white font-bold">
                            Instant Liquidity
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          Subject to underlying protocol liquidity. Standard
                          USDC withdrawals processed instantly.
                        </span>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-white font-bold">
                            Partial Withdrawals
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          Withdraw any percentage of your position - no need to
                          exit completely.
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
                      Your Risk Profile is more than a setting; it's a{" "}
                      <span className="text-white font-semibold">
                        blockchain-native identity
                      </span>
                      . After completing the onboarding survey, the protocol
                      mints a non-transferable{" "}
                      <span className="text-pink-400 font-bold">RiskNFT</span>{" "}
                      to your wallet.
                    </p>
                    <p>
                      This NFT stores your allocation ratios (
                      <span className="text-green-400">lowPct</span>,{" "}
                      <span className="text-yellow-400">medPct</span>,{" "}
                      <span className="text-red-400">highPct</span>). When the{" "}
                      <code className="text-[#135bec] bg-[#135bec]/10 px-2 py-0.5 rounded">
                        VaultRouter
                      </code>{" "}
                      receives a deposit, it reads these values to determine
                      capital distribution.
                    </p>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-4">
                      <h4 className="text-white font-semibold mb-3">
                        Soulbound Properties
                      </h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Lock className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                          <span>
                            <span className="text-white font-semibold">
                              Non-Transferable:
                            </span>{" "}
                            Cannot be sold or transferred - tied to your wallet
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <RefreshCw className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                          <span>
                            <span className="text-white font-semibold">
                              Updateable:
                            </span>{" "}
                            Modify your risk profile anytime via dashboard
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                          <span>
                            <span className="text-white font-semibold">
                              On-Chain Enforcement:
                            </span>{" "}
                            Smart contracts read NFT data automatically
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-pink-500/10 border-l-4 border-pink-500 p-4 rounded-r-xl text-sm">
                      <p className="font-semibold text-white mb-1">Pro-tip:</p>
                      <p>
                        Update your risk profile anytime via your dashboard.
                        This updates your existing NFT data, reconfiguring all
                        future deposits instantly.
                      </p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 flex flex-col items-center justify-center bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30">
                    <div className="w-32 h-40 bg-white/5 border-2 border-pink-500/50 rounded-2xl relative mb-4 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                      <div className="absolute inset-x-3 top-3 h-20 bg-gradient-to-br from-[#135bec] to-pink-500 rounded-lg opacity-90" />
                      <div className="absolute inset-x-3 bottom-6 space-y-1">
                        <div className="h-1 bg-white/20 rounded" />
                        <div className="h-1 bg-white/20 rounded" />
                        <div className="h-1 bg-white/20 rounded w-3/4" />
                      </div>
                    </div>
                    <span className="text-xs uppercase font-bold text-pink-400 mb-1">
                      Risk Profile NFT
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Soulbound • Non-Transferable
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Smart Contracts */}
            <section id="contracts" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl text-white">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <Code className="w-6 h-6 text-gray-400" />
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
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 text-[#135bec] font-mono font-semibold">
                          VaultRouter
                        </td>
                        <td className="px-4 py-4">
                          Entry point for deposits/withdrawals. Coordinates
                          multi-vault routing based on Risk NFT.
                        </td>
                        <td className="px-4 py-4">Custom</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 text-[#135bec] font-mono font-semibold">
                          BaseVault
                        </td>
                        <td className="px-4 py-4">
                          The yield engine. Manages asset allocation to specific
                          strategies per risk tier.
                        </td>
                        <td className="px-4 py-4">ERC-4626</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 text-[#135bec] font-mono font-semibold">
                          VirtualUSDC
                        </td>
                        <td className="px-4 py-4">
                          The underlying yield-bearing asset. Native USDC on Arc
                          testnet via Circle CCTP.
                        </td>
                        <td className="px-4 py-4">ERC-20</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 text-[#135bec] font-mono font-semibold">
                          RiskNFT
                        </td>
                        <td className="px-4 py-4">
                          Soulbound token storing user risk metadata and
                          allocation configuration.
                        </td>
                        <td className="px-4 py-4">ERC-721</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 text-[#135bec] font-mono font-semibold">
                          YieldReserve
                        </td>
                        <td className="px-4 py-4">
                          Pre-funded reserve for realistic yield distribution
                          during testing phase.
                        </td>
                        <td className="px-4 py-4">Custom</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-6 text-xs text-gray-500">
                  All contracts are open-source and verified on Arc Explorer.
                  Review the source code for the most accurate technical
                  representation of protocol logic.
                </p>

                <div className="mt-6 bg-[#135bec]/10 border border-[#135bec]/20 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#135bec]" />
                    Key Addresses (Arc Testnet)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span className="text-gray-400">Native USDC:</span>
                      <span className="text-[#135bec]">0x3600...0000</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span className="text-gray-400">Deploy after setup</span>
                      <span className="text-gray-500">See docs</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Getting Started */}
            <section id="getting-started" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  Getting Started
                </h2>
                <div className="space-y-6">
                  <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-xl">
                    <h4 className="text-yellow-400 font-bold mb-2">
                      Prerequisites
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="text-gray-300">Node.js ≥ 18.0</div>
                      <div className="text-gray-300">Python ≥ 3.10</div>
                      <div className="text-gray-300">Foundry</div>
                      <div className="text-gray-300">MongoDB</div>
                    </div>
                  </div>

                  {/* Setup Steps */}
                  <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[#135bec] text-white flex items-center justify-center text-sm font-bold">
                          1
                        </span>
                        Deploy Contracts
                      </h3>
                      <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto mb-3">
                        <code>{`cd contracts

# Set environment variables
cp .env.example .env
# Edit .env with your private key

# Deploy YieldReserve (one-time)
forge script script/DeployYieldReserve.s.sol:DeployYieldReserve \\
    --broadcast --rpc-url $RPC_URL

# Deploy main contracts
forge script script/Deploy.s.sol:Deploy \\
    --broadcast --rpc-url $RPC_URL`}</code>
                      </div>
                      <p className="text-sm text-gray-400">
                        Save the deployed contract addresses for later
                        configuration.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                          2
                        </span>
                        Start AI Engine
                      </h3>
                      <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto mb-3">
                        <code>{`cd ai-models

# Install dependencies
pip install -r requirements.txt

# Set Groq API key
cp .env.example .env
echo 'GROQ_API_KEY="your-key-here"' >> .env

# Start server
python -m uvicorn app.main:app --reload --port 8000`}</code>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                          3
                        </span>
                        Start Backend Keeper
                      </h3>
                      <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto mb-3">
                        <code>{`cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add contract addresses from deployment

# Start MongoDB
mongod --dbpath ./data

# Run keeper
npm start`}</code>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                          4
                        </span>
                        Authorize Keeper
                      </h3>
                      <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto mb-3">
                        <code>{`cd contracts

# Authorize backend as Nitrolite operator
forge script script/AddOperator.s.sol:AddOperator \\
    --broadcast --rpc-url $RPC_URL`}</code>
                      </div>
                      <p className="text-sm text-gray-400">
                        This allows the keeper to sign and settle rebalancing
                        operations.
                      </p>
                    </div>
                  </div>

                  {/* CCTP Note */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
                    <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Circle CCTP Setup
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li className="flex gap-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          Get testnet USDC from{" "}
                          <a
                            href="https://faucet.circle.com"
                            className="text-[#135bec] underline hover:text-blue-400"
                            target="_blank"
                            rel="noopener"
                          >
                            Circle Faucet
                          </a>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          Bridge from any chain using{" "}
                          <a
                            href="https://www.circle.com/en/cross-chain-transfer-protocol"
                            className="text-[#135bec] underline hover:text-blue-400"
                            target="_blank"
                            rel="noopener"
                          >
                            Circle CCTP
                          </a>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          Arc testnet automatically receives native USDC - no
                          wrapped tokens!
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Project Structure */}
            <section id="structure" className="mb-16">
              <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <Layers className="w-6 h-6 text-gray-400" />
                  </div>
                  Project Structure
                </h2>
                <div className="bg-black/30 rounded-lg p-6 font-mono text-xs text-gray-300 overflow-x-auto">
                  <pre>{`aura-protocol/
├── contracts/              # Solidity smart contracts
│   ├── src/
│   │   ├── vaults/        # ERC4626 vaults (3 tiers)
│   │   ├── strategies/    # Yield strategies (9 total)
│   │   ├── RiskNFT.sol    # Soulbound profile NFT
│   │   ├── VaultRouter.sol # User-facing entry point
│   │   └── YieldReserve.sol # Yield distribution
│   └── script/            # Deployment scripts
│
├── backend/               # Automation backend
│   ├── src/
│   │   ├── keeper.js      # Main orchestrator
│   │   ├── api.js         # User rebalance API
│   │   └── services/      # Nitrolite, DB, AI
│   └── abis/              # Contract ABIs
│
└── ai-models/             # AI allocation engine
    └── app/
        ├── graph.py       # LangChain agent
        └── main.py        # FastAPI server`}</pre>
                </div>
              </div>
            </section>

            {/* Footer CTA */}
            <div className="glass-panel p-8 rounded-2xl text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to Start Earning?
              </h3>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                Now that you understand how Aura Protocol works, create your
                risk profile and make your first deposit to start earning
                personalized yield.
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
