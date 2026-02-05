import { useState } from "react";
import { ArrowRight, TrendingUp, Diamond } from "lucide-react";
import { RiskAssessmentModal } from "./risk-assessment-modal";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAccount, useEnsName, useReadContract } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "@wagmi/core";
import { config } from "@/config/wagmiConfig";
import { namehash } from "viem";

import RISK_NFT_ABI from "@/abi/RiskNFT.json";

const AuraVaultLanding = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const VITE_RISK_NFT_ADDRESS = import.meta.env.VITE_RISK_NFT_ADDRESS;
  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address });

  // Universal Discovery
  const { data: tokenId, refetch: refetchTokenId } = useReadContract({
    address: VITE_RISK_NFT_ADDRESS as `0x${string}`,
    abi: RISK_NFT_ABI,
    functionName: "getPrimaryTokenId",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  const hasRiskNFT = !!tokenId;

  const handleMintClick = () => {
    if (!isConnected) {
      // User not connected - you could show a "Connect Wallet" message
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to mint a Risk NFT",
      });
      return;
    }

    if (hasRiskNFT) {
      // User already has NFT
      toast.info("You already have a Risk NFT", {
        description: "Each wallet can only have one Risk NFT",
      });
      return;
    }

    // Open the modal
    setIsModalOpen(true);
  };


  const handleModalSubmit = async (
    allocation: {
      low: number;
      mid: number;
      high: number;
    },
    identity: { type: "address" | "ens"; ensName?: string },
  ) => {
    if (!address) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to mint a Risk NFT",
      });
      return;
    }

    const { low, mid, high } = allocation;

    try {
      let txn;
      if (hasRiskNFT && tokenId) {
        txn = await writeContract(config, {
          abi: RISK_NFT_ABI,
          address: VITE_RISK_NFT_ADDRESS as `0x${string}`,
          functionName: "updateRiskProfile",
          args: [tokenId, low, mid, high],
        });
      } else if (identity.type === "address") {
        txn = await writeContract(config, {
          abi: RISK_NFT_ABI,
          address: VITE_RISK_NFT_ADDRESS as `0x${string}`,
          functionName: "mintWithAddress",
          args: [low, mid, high],
        });
      } else {
        if (!identity.ensName) throw new Error("ENS name is required");
        const node = namehash(identity.ensName);
        txn = await writeContract(config, {
          abi: RISK_NFT_ABI,
          address: VITE_RISK_NFT_ADDRESS as `0x${string}`,
          functionName: "mintWithENS",
          args: [node, low, mid, high],
        });
      }

      const receipt = await waitForTransactionReceipt(config, {
        hash: txn,
      });

      if (receipt.status === "success") {
        toast.success("Risk NFT minted successfully", {
          description: "You can now use the Risk NFT in the vault",
        });
        refetchTokenId();
      }
    } catch (error: any) {
      console.error("Mint error:", error);
      const msg = error.shortMessage || error.message || "Please check your console";
      toast.error("Transaction failed", {
        description: msg.includes("ENS owner")
          ? "ENS check failed. Try using 'Wallet Address' instead or ensure the contract is redeployed."
          : msg,
      });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0B0C10] text-white font-sans overflow-x-hidden selection:bg-primary/30 selection:text-white">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Deep primary glow top center */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[#135bec]/5 blur-[120px]"></div>
        {/* Secondary darker glow bottom right */}
        <div className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[100px]"></div>
        {/* Noise pattern */}
        <div className="bg-noise"></div>
      </div>

      {/* Main Hero Content */}
      <main className="relative z-10 flex min-h-screen flex-col justify-center px-6 pt-24 pb-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Typography Section */}
            <div className="lg:col-span-7 flex flex-col gap-8 lg:pr-12">
              <div className="flex flex-col gap-6">
                {/* Badge */}
                <div className="flex items-center gap-2 w-fit px-3 py-1 rounded-full border border-[#135bec]/20 bg-[#135bec]/5 backdrop-blur-sm">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#135bec] animate-pulse"></span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#135bec]">
                    Arc testnet Live
                  </span>
                </div>

                {ensName && (
                  <div className="flex items-center gap-2 w-fit px-3 py-1 rounded-full border border-[#135bec]/20 bg-[#135bec]/5 backdrop-blur-sm animate-fadeIn">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-[#135bec] animate-pulse"></span>
                    <span className="text-[10px] font-semibold tracking-wider text-[#135bec]">
                      ENS detected: {ensName}
                    </span>
                  </div>
                )}

                {/* Headline */}
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1.05] text-white text-glow">
                  Tokenized Risk.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">
                    Engineered Yield.
                  </span>
                </h1>

                {/* Subtext */}
                <p className="text-lg text-gray-400 font-light tracking-wide leading-relaxed max-w-xl border-l border-white/10 pl-6">
                  Institutional-grade yield aggregation strategies, protected by
                  on-chain volatility derivatives. The calm amongst the chaos.
                </p>
              </div>

              {/* CTA Group */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <button
                  onClick={handleMintClick}
                  className="glass-button relative group h-14 px-8 rounded-full flex items-center justify-center gap-3 overflow-hidden transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-[#135bec]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <Diamond className="text-[#135bec] w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-sm font-semibold tracking-wide text-white group-hover:text-white transition-colors">
                    Mint Risk NFT
                  </span>
                  <ArrowRight className="text-white/50 w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  to="/vault"
                  className="text-sm font-medium text-gray-500 hover:text-white transition-colors flex items-center gap-1 group"
                >
                  Go to Vault
                  <span className="text-[16px] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform">
                    ↗
                  </span>
                </Link>
              </div>
            </div>

            {/* Visual Section */}
            <div className="lg:col-span-5 relative h-[500px] flex items-center justify-center perspective-1000">
              {/* Decorative background glows behind the object */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-[#135bec]/20 rounded-full blur-[80px] animate-pulse"></div>
              </div>

              {/* Abstract 3D Vault Container */}
              <div className="relative w-full h-full max-h-[500px] flex items-center justify-center animate-float">
                {/* Glass card simulation for the 3D object placeholder */}
                <div className="relative w-[340px] h-[340px] md:w-[420px] md:h-[420px]">
                  {/* We use an image placeholder */}
                  <img
                    className="w-full h-full object-cover rounded-[3rem] opacity-90 shadow-2xl mix-blend-lighten"
                    // src="https://lh3.googleusercontent.com/aida-public/AB6AXuCX0UI1dmuqbtn9GzPWsSOoWqUVbo_w5bFOpDvWMdxtRDJl3CbSrDzHCOuwO8bAVHRgfvYhL282JuCDXO4E5rnfZ10UxdW5a3lZSahByU6Y-ilG70gM15hhZVX1kCpkHWvRXIcc6MT_TY_udkHZ1zUsIHdS2Rlr9o2t2xpe4EdbjFqUG1HcZSu-TcMnkMYMVUrwYIFOiQS8LCGDXUmfvK-x9pogqbc8RKL3Xveq_FIXdTkMxyeiG9jOxyc0WyWVlT4v_XLdTj8WyDqr"
                    src="https://web3.career/laser-eyes/famous-people-laser-eyes/trump-laser-eyes.png"
                    alt="Abstract ethereal blue geometric light shapes floating in a dark void representing a digital vault"
                    style={{
                      WebkitMaskImage:
                        "radial-gradient(circle at center, black 40%, transparent 70%)",
                      maskImage:
                        "radial-gradient(circle at center, black 40%, transparent 70%)",
                    }}
                  />
                  {/* Overlaid glass reflections */}
                  <div className="absolute inset-0 rounded-[3rem] border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
                  {/* Floating Particles */}
                  <div className="absolute top-10 right-10 w-3 h-3 bg-[#135bec] rounded-full blur-[2px] shadow-[0_0_10px_rgba(19,91,236,0.8)] animate-pulse"></div>
                  <div className="absolute bottom-20 left-10 w-2 h-2 bg-white rounded-full blur-[1px] opacity-60"></div>
                </div>

                {/* Floating UI Card Detail (simulating 3D depth) */}
                <div
                  className="absolute -bottom-6 -right-4 md:right-10 glass-panel p-4 rounded-2xl flex flex-col gap-2 max-w-[180px] animate-float"
                  style={{ animationDelay: "1s" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="text-green-400 w-4 h-4" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">
                      Risk Factor
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[20%] bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-gray-500">Low</span>
                    <span className="text-sm font-bold text-white">0.05</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Risk Assessment Modal */}
      <RiskAssessmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        mode={hasRiskNFT ? "update" : "mint"}
      />
    </div>
  );
};

export default AuraVaultLanding;