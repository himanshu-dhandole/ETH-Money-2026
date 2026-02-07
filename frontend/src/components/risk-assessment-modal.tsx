import { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  Shield,
  TrendingUp,
  Zap,
  Sliders,
  Bot,
} from "lucide-react";
import { toast } from "sonner";

interface RiskAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (allocation: { low: number; mid: number; high: number }) => void;
  mode?: "mint" | "update";
}

interface Question {
  id: number;
  question: string;
  options: { label: string; value: string }[];
}

const questions: Question[] = [
  {
    id: 1,
    question: "If your investment drops suddenly, what will you do?",
    options: [
      {
        label: "Sell immediately to prevent further loss",
        value: "conservative",
      },
      { label: "Hold and wait for recovery", value: "moderate" },
      {
        label: "Invest more because it’s a buying opportunity",
        value: "aggressive",
      },
    ],
  },
  {
    id: 2,
    question: "What matters more to you?",
    options: [
      { label: "Capital safety and peace of mind", value: "conservative" },
      { label: "Balanced growth with some volatility", value: "moderate" },
      { label: "High returns even if ups & downs happen", value: "aggressive" },
    ],
  },
  {
    id: 3,
    question: "How stable is your income + emergency backup?",
    options: [
      { label: "Income is uncertain, limited savings", value: "conservative" },
      { label: "Income is stable with some savings", value: "moderate" },
      {
        label: "Income is stable and I have 6+ months emergency fund",
        value: "aggressive",
      },
    ],
  },
  {
    id: 4,
    question: "How long can you keep your money invested without needing it?",
    options: [
      { label: "Less than 1 year", value: "conservative" },
      { label: "1–3 years", value: "moderate" },
      { label: "More than 3 years", value: "aggressive" },
    ],
  },
];

export const RiskAssessmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  mode = "mint",
}: RiskAssessmentModalProps) => {
  const [step, setStep] = useState<"chat" | "results">("chat");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerLabels, setAnswerLabels] = useState<Record<number, string>>({});
  const [chatMessages, setChatMessages] = useState<
    { role: "bot" | "user"; text: string }[]
  >([]);
  const [allocation, setAllocation] = useState({ low: 0, mid: 0, high: 0 });
  const [isCalculating, setIsCalculating] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const editableKeys: ("low" | "mid" | "high")[] = ["low", "mid"];
  const autoKey = (["low", "mid", "high"] as const).find(
    (k) => !editableKeys.includes(k),
  )!;

  useEffect(() => {
    if (isOpen) {
      setChatMessages([
        {
          role: "bot",
          text: "Hi 👋 Let’s understand your risk appetite. Answer a few quick questions.",
        },
      ]);
      setCurrentQuestionIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOptionSelect = (label: string) => {
    const q = questions[currentQuestionIndex];

    setAnswerLabels((p) => ({ ...p, [q.id]: label }));
    setChatMessages((p) => [...p, { role: "user", text: label }]);

    const next = currentQuestionIndex + 1;
    if (next < questions.length) {
      setTimeout(() => {
        setChatMessages((p) => [
          ...p,
          { role: "bot", text: questions[next].question },
        ]);
        setCurrentQuestionIndex(next);
      }, 500);
    } else {
      setTimeout(callRiskApi, 700);
    }
  };

  const callRiskApi = async () => {
    setIsCalculating(true);

    const QA: Record<string, string> = {};
    questions.forEach((q) => {
      QA[`Q${q.id}) ${q.question}`] = answerLabels[q.id];
    });

    try {
      const res = await fetch(
        "https://ethmoney-aiservice.onrender.com/generate-risk-score",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ QA }),
        },
      );

      const data = await res.json();
      const { low_risk, medium_risk, high_risk } = data.risk_score;

      setAllocation({
        low: low_risk,
        mid: medium_risk,
        high: high_risk,
      });

      setTimeout(() => {
        setStep("results");
        toast.success("Risk profile generated");
      }, 800);
    } catch {
      toast.error("Failed to generate risk profile");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSliderChange = (key: "low" | "mid" | "high", value: number) => {
    if (!editableKeys.includes(key)) return;

    const updated = { ...allocation, [key]: value };
    const sumEditable = editableKeys.reduce((s, k) => s + updated[k], 0);
    updated[autoKey] = Math.max(0, 100 - sumEditable);

    setAllocation(updated);
  };

  const handleMintNFT = () => {
    onSubmit(allocation);
    toast.success(mode === "mint" ? "Risk NFT Minted" : "Risk Profile Updated");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full glass-panel rounded-3xl p-8">
        <button onClick={onClose} className="absolute top-6 right-6">
          <X
            className="text-gray-400"
            onClick={() => {
              setEditMode(false);
            }}
          />
        </button>

        {step === "chat" ? (
          <>
            <h2 className="text-xl font-bold text-white flex gap-2 mb-4">
              <Sparkles /> AI Risk Assessment
            </h2>

            {/* Chat Area */}
            <div className="space-y-4 mb-6 max-h-[420px] overflow-y-auto pr-2">
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role === "bot" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`px-4 py-3 rounded-2xl text-sm max-w-[75%] animate-fadeIn ${
                      m.role === "user"
                        ? "bg-blue-500 text-white rounded-br-sm"
                        : "bg-white/10 text-white rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {isCalculating && (
                <div className="flex gap-3 items-center bg-white/5 p-4 rounded-xl">
                  <div className="animate-pulse w-8 h-8 rounded-full bg-purple-500/40 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm text-gray-300">
                    AI is analyzing your risk profile
                    <span className="animate-pulse">...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            {!isCalculating &&
              questions[currentQuestionIndex]?.options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleOptionSelect(opt.label)}
                  className="w-full mb-2 px-4 py-3 bg-white/5 hover:bg-white/10 transition rounded-xl text-left text-white"
                >
                  {opt.label}
                </button>
              ))}
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">
              Your Risk Profile
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              AI-generated allocation. You can fine-tune it before minting.
            </p>

            <div className="h-4 w-full rounded-full overflow-hidden flex mb-8 bg-white/5">
              <div
                className="bg-green-500"
                style={{ width: `${allocation.low}%` }}
              />
              <div
                className="bg-yellow-500"
                style={{ width: `${allocation.mid}%` }}
              />
              <div
                className="bg-red-500"
                style={{ width: `${allocation.high}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <RiskCard
                icon={<Shield className="text-green-500" />}
                title="Low Risk"
                value={allocation.low}
              />
              <RiskCard
                icon={<TrendingUp className="text-yellow-500" />}
                title="Mid Risk"
                value={allocation.mid}
              />
              <RiskCard
                icon={<Zap className="text-red-500" />}
                title="High Risk"
                value={allocation.high}
              />
            </div>

            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="w-full mb-6 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white"
              >
                <Sliders className="w-4 h-4" />
                Update Manually
              </button>
            )}

            {editMode && (
              <div className="space-y-4 mb-8">
                {(["low", "mid", "high"] as const).map((k) => (
                  <div key={k}>
                    <label className="text-sm text-gray-400 capitalize">
                      {k} Risk — {allocation[k]}%
                      {!editableKeys.includes(k) && " (auto)"}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={allocation[k]}
                      disabled={!editableKeys.includes(k)}
                      onChange={(e) =>
                        handleSliderChange(k, parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleMintNFT}
              className="w-full h-14 glass-button rounded-full text-white font-semibold"
            >
              {mode === "mint" ? "Mint Risk NFT" : "Save Risk Profile"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const RiskCard = ({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
}) => (
  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h3 className="text-white font-semibold">{title}</h3>
    </div>
    <div className="text-3xl font-bold text-white">{value}%</div>
  </div>
);
