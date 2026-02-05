import { useState, useEffect } from "react";
import { X, Sparkles, TrendingUp, Shield, Zap, Wallet, Globe, CheckCircle2, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useEnsName } from "wagmi";

interface RiskAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    allocation: { low: number; mid: number; high: number },
    identity: { type: "address" | "ens"; ensName?: string },
  ) => void;
  mode?: "mint" | "update"; // mint = create new NFT, update = update existing NFT
}

interface Question {
  id: number;
  question: string;
  options: { label: string; value: string }[];
}

const questions: Question[] = [
  {
    id: 1,
    question: "What is your primary investment goal?",
    options: [
      { label: "Preserve capital with minimal risk", value: "conservative" },
      { label: "Balanced growth with moderate risk", value: "moderate" },
      { label: "Maximize returns, accepting high risk", value: "aggressive" },
    ],
  },
  {
    id: 2,
    question: "How would you react to a 30% portfolio drop?",
    options: [
      {
        label: "Sell immediately to prevent further loss",
        value: "conservative",
      },
      { label: "Hold and wait for recovery", value: "moderate" },
      { label: "Buy more at the lower price", value: "aggressive" },
    ],
  },
  {
    id: 3,
    question: "What is your investment time horizon?",
    options: [
      { label: "Less than 1 year", value: "conservative" },
      { label: "1-3 years", value: "moderate" },
      { label: "More than 3 years", value: "aggressive" },
    ],
  },
  {
    id: 4,
    question: "How much of your portfolio are you willing to allocate to DeFi?",
    options: [
      { label: "Less than 10%", value: "conservative" },
      { label: "10-30%", value: "moderate" },
      { label: "More than 30%", value: "aggressive" },
    ],
  },
];

export const RiskAssessmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  mode = "mint", // Default to mint mode
}: RiskAssessmentModalProps) => {
  const [step, setStep] = useState<"questionnaire" | "results">(
    "questionnaire",
  );
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [allocation, setAllocation] = useState({ low: 33, mid: 34, high: 33 });
  const [isCalculating, setIsCalculating] = useState(false);
  const [identityType, setIdentityType] = useState<"address" | "ens">("address");
  const [ensName, setEnsName] = useState("");

  const { address } = useAccount();
  const { data: fetchedEnsName, isLoading: isLoadingEns } = useEnsName({
    address: address,
  });

  // Effect to populate ENS if found
  useEffect(() => {
    if (fetchedEnsName) {
      setEnsName(fetchedEnsName);
      setIdentityType("ens");
    }
  }, [fetchedEnsName]);

  if (!isOpen) return null;

  const handleAnswerSelect = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const calculateRiskProfile = () => {
    setIsCalculating(true);

    // Simulate AI processing
    setTimeout(() => {
      // Count answer types
      const answerValues = Object.values(answers);
      const conservative = answerValues.filter(
        (a) => a === "conservative",
      ).length;
      const aggressive = answerValues.filter((a) => a === "aggressive").length;

      // Calculate allocation based on answers
      let low = 0,
        mid = 0,
        high = 0;

      if (conservative >= 3) {
        // Very conservative
        low = 70;
        mid = 25;
        high = 5;
      } else if (conservative >= 2) {
        // Conservative
        low = 50;
        mid = 35;
        high = 15;
      } else if (aggressive >= 3) {
        // Very aggressive
        low = 10;
        mid = 30;
        high = 60;
      } else if (aggressive >= 2) {
        // Aggressive
        low = 20;
        mid = 30;
        high = 50;
      } else {
        // Moderate/Balanced
        low = 30;
        mid = 50;
        high = 20;
      }

      setAllocation({ low, mid, high });
      setIsCalculating(false);
      setStep("results");
      toast.success("Risk profile calculated");
    }, 2000);
  };

  const handleSliderChange = (type: "low" | "mid" | "high", value: number) => {
    const newAllocation = { ...allocation, [type]: value };

    // Ensure total is always 100%
    const total = newAllocation.low + newAllocation.mid + newAllocation.high;
    if (total !== 100) {
      // Adjust other values proportionally
      const diff = 100 - total;
      const others = Object.keys(newAllocation).filter(
        (k) => k !== type,
      ) as Array<"low" | "mid" | "high">;

      if (others.length === 2) {
        const adjust = diff / 2;
        // Round to integers to prevent decimals
        newAllocation[others[0]] = Math.round(
          Math.max(0, Math.min(100, newAllocation[others[0]] + adjust)),
        );
        newAllocation[others[1]] = Math.round(
          Math.max(0, Math.min(100, newAllocation[others[1]] + adjust)),
        );
      }
    }

    // Ensure all values are integers
    newAllocation.low = Math.round(newAllocation.low);
    newAllocation.mid = Math.round(newAllocation.mid);
    newAllocation.high = Math.round(newAllocation.high);

    setAllocation(newAllocation);
  };

  const handleMintNFT = () => {
    if (identityType === "ens" && !ensName) {
      toast.error("Please enter an ENS name");
      return;
    }
    const actionText = mode === "mint" ? "created" : "updated";
    toast.success(`Risk profile ${actionText} successfully`);
    onSubmit(allocation, { type: identityType, ensName: identityType === "ens" ? ensName : undefined });
    handleClose();
  };

  const handleClose = () => {
    setStep("questionnaire");
    setAnswers({});
    setAllocation({ low: 33, mid: 34, high: 33 });
    setIdentityType("address");
    setEnsName("");
    onClose();
  };

  const allQuestionsAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl glass-panel rounded-3xl p-8 max-h-[90vh] overflow-y-auto animate-scaleIn scrollbar-hide">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors group"
        >
          <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
        </button>

        {step === "questionnaire" ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[#135bec]/10 border border-[#135bec]/20">
                  <Sparkles className="w-5 h-5 text-[#135bec]" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Risk Profile Assessment
                </h2>
              </div>
              <p className="text-gray-400 text-sm">
                Answer a few questions to help us determine your optimal risk
                allocation. You can adjust the results manually afterward.
              </p>
            </div>

            {/* Questions */}
            <div className="space-y-6 mb-8">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#135bec]/20 text-[#135bec] text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-white font-medium text-sm">
                      {q.question}
                    </p>
                  </div>
                  <div className="space-y-2 ml-9">
                    {q.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleAnswerSelect(q.id, option.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${answers[q.id] === option.value
                          ? "bg-[#135bec]/20 border-[#135bec]/50 text-white"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                          } border`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateRiskProfile}
              disabled={!allQuestionsAnswered || isCalculating}
              className={`w-full glass-button h-14 px-8 rounded-full flex items-center justify-center gap-3 transition-all duration-300 ${!allQuestionsAnswered || isCalculating
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-[1.02]"
                }`}
            >
              {isCalculating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm font-semibold text-white">
                    Analyzing Your Profile...
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-[#135bec]" />
                  <span className="text-sm font-semibold text-white">
                    Calculate Risk Profile
                  </span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Results Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Your Risk Allocation
                </h2>
              </div>
              <p className="text-gray-400 text-sm">
                Based on your answers, we've calculated an optimal allocation.
                You can adjust the sliders below to customize your strategy.
              </p>
            </div>

            {/* Allocation Visualization */}
            <div className="mb-8">
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex">
                <div
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${allocation.low}%` }}
                ></div>
                <div
                  className="bg-yellow-500 transition-all duration-500"
                  style={{ width: `${allocation.mid}%` }}
                ></div>
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${allocation.high}%` }}
                ></div>
              </div>
            </div>

            {/* Allocation Sliders */}
            <div className="space-y-6 mb-8">
              {/* Low Risk */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-white font-semibold">Low Risk</span>
                  </div>
                  <span className="text-2xl font-bold text-green-500">
                    {allocation.low}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={allocation.low}
                  onChange={(e) =>
                    handleSliderChange("low", parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider-green"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Stablecoins, Aave Bluechip, Low-volatility yields
                </p>
              </div>

              {/* Mid Risk */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-yellow-500" />
                    <span className="text-white font-semibold">Mid Risk</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-500">
                    {allocation.mid}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={allocation.mid}
                  onChange={(e) =>
                    handleSliderChange("mid", parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider-yellow"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Lido, rETH, Curve, Balanced strategies
                </p>
              </div>

              {/* High Risk */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-red-500" />
                    <span className="text-white font-semibold">High Risk</span>
                  </div>
                  <span className="text-2xl font-bold text-red-500">
                    {allocation.high}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={allocation.high}
                  onChange={(e) =>
                    handleSliderChange("high", parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider-red"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Meme pools, Emerging opportunities, Leveraged yields
                </p>
              </div>
            </div>

            {/* Total Allocation Status */}
            <div className="flex items-center justify-between mb-8 px-6 py-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${allocation.low + allocation.mid + allocation.high === 100 ? 'text-[#135bec]' : 'text-red-500'}`} />
                <span className="text-xs font-semibold text-white tracking-wide uppercase">AI Calibration</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${allocation.low + allocation.mid + allocation.high === 100 ? 'bg-[#135bec]' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(allocation.low + allocation.mid + allocation.high, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-bold font-mono ${allocation.low + allocation.mid + allocation.high === 100 ? 'text-[#135bec]' : 'text-red-500'}`}>
                  {allocation.low + allocation.mid + allocation.high}%
                </span>
              </div>
            </div>

            {/* Identity Selection */}
            {mode === "mint" && (
              <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group/identity">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/identity:opacity-10 transition-opacity">
                  <Fingerprint className="w-16 h-16 text-white" />
                </div>

                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#135bec]/10 border border-[#135bec]/20">
                    <Sparkles className="w-4 h-4 text-[#135bec]" />
                  </div>
                  Mint Identity
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setIdentityType("address")}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${identityType === "address"
                      ? "bg-[#135bec]/10 border-[#135bec]/30 text-white"
                      : "bg-white/2 border-white/5 text-gray-500 hover:bg-white/5"
                      }`}
                  >
                    <Wallet className={`w-5 h-5 ${identityType === "address" ? "text-[#135bec]" : "text-gray-600"}`} />
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest">Address</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIdentityType("ens")}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 relative ${identityType === "ens"
                      ? "bg-[#135bec]/10 border-[#135bec]/30 text-white"
                      : "bg-white/2 border-white/5 text-gray-500 hover:bg-white/5"
                      }`}
                  >
                    <Globe className={`w-5 h-5 ${identityType === "ens" ? "text-[#135bec]" : "text-gray-600"}`} />
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest">ENS Name</div>
                    </div>
                    {fetchedEnsName && identityType !== "ens" && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#135bec] rounded-full border-2 border-[#0B0C10] animate-pulse" />
                    )}
                  </button>
                </div>

                <div className="space-y-4">
                  {identityType === "address" ? (
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 animate-fadeIn">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 ml-1">Connected Address</div>
                      <div className="text-sm font-mono text-gray-300 truncate tracking-tight">{address}</div>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="alice.eth"
                          value={ensName}
                          onChange={(e) => setEnsName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#135bec]/50 transition-all"
                        />
                        {fetchedEnsName === ensName && ensName !== "" && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <CheckCircle2 className="w-5 h-5 text-[#135bec] animate-scaleIn" />
                          </div>
                        )}
                        {isLoadingEns && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-[#135bec]/20 border-t-[#135bec] rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 ml-1">
                        Enter your .eth domain. Your ENS owner address must match your current wallet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total Validation */}
            <div className="mb-6 p-4 rounded-xl bg-[#135bec]/10 border border-[#135bec]/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total Allocation</span>
                <span
                  className={`text-lg font-bold ${allocation.low + allocation.mid + allocation.high === 100
                    ? "text-green-500"
                    : "text-red-500"
                    }`}
                >
                  {allocation.low + allocation.mid + allocation.high}%
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep("questionnaire")}
                className="flex-1 h-14 px-6 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white font-semibold text-sm"
              >
                Back to Questions
              </button>
              <button
                onClick={handleMintNFT}
                disabled={
                  allocation.low + allocation.mid + allocation.high !== 100
                }
                className={`flex-1 glass-button h-14 px-6 rounded-full flex items-center justify-center gap-3 transition-all duration-300 ${allocation.low + allocation.mid + allocation.high !== 100
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-[1.02]"
                  }`}
              >
                <Shield className="w-5 h-5 text-[#135bec]" />
                <span className="text-sm font-semibold text-white">
                  {mode === "mint" ? "Mint Risk NFT" : "Update Risk NFT"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};