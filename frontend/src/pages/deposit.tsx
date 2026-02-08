"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getChainId,
  getBalance,
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { useAccount } from "wagmi";
import DefaultLayout from "@/layouts/default";
import { config, arcTestnet } from "@/config/wagmiConfig";
import VIRTUAL_USDC_ABI from "@/abi/VirtualUSDC.json";
import VAULT_ROUTER_ABI from "@/abi/VaultRouter.json";
import GATEWAY_WALLET_ABI from "@/abi/GatewayWallet.json";
import { toast } from "sonner";
import {
  ArrowRight,
  Lock,
  Plus,
  TrendingUp,
  Gift,
  Wallet,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
} from "lucide-react";
import {
  formatUnits,
  parseUnits,
  pad,
  toHex,
  maxUint256,
  createPublicClient,
  http,
} from "viem";
import { useSwitchChain, useChainId, useSignTypedData } from "wagmi";
import { getGatewayConfig, GATEWAY_API_URL } from "@/config/gateway";

/* --------------------------------------------------
   ENV
-------------------------------------------------- */

const USDC = import.meta.env.VITE_VIRTUAL_USDC_ADDRESS as `0x${string}`;
const VAULT = import.meta.env.VITE_VAULT_ROUTER_ADDRESS as `0x${string}`;

/* --------------------------------------------------
   TYPES
-------------------------------------------------- */

type Network = "arc" | "sepolia";

interface UserState {
  auraBalance: string;
  USDCBalance: string;
  totalDeposited: string;
  userValue: string;
}

/* --------------------------------------------------
   MODAL COMPONENT
-------------------------------------------------- */

interface Step {
  id: string;
  label: string;
  status: "idle" | "loading" | "success" | "error";
  subtext?: string;
}

const TransactionModal = ({
  isOpen,
  onClose,
  title,
  steps,
  currentHash,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: Step[];
  currentHash?: string;
}) => {
  if (!isOpen) return null;

  const currentStepIndex = steps.findIndex(
    (s) => s.status === "loading" || s.status === "error",
  );
  const activeIndex =
    currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

  const isComplete = steps.every((s) => s.status === "success");
  const isError = steps.some((s) => s.status === "error");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn transition-colors duration-300">
      <div
        className="w-full max-w-[400px] bg-[#13141b] rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5 relative overflow-hidden animate-scaleIn flex flex-col"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-[#135bec] to-transparent opacity-60" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <h3 className="text-lg font-semibold text-white tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Container */}
        <div className="p-6 pt-4 space-y-0 relative">
          {/* Vertical Connecting Line */}
          <div className="absolute left-[39px] top-8 bottom-10 w-[2px] bg-white/5 z-0" />

          {steps.map((step, idx) => {
            const isActive = idx === activeIndex;
            const isCompleted = step.status === "success";
            const isErrorState = step.status === "error";
            const isPending = step.status === "idle";

            return (
              <div
                key={step.id}
                className={`relative z-10 flex items-start gap-4 py-3 transition-opacity duration-300 ${isPending && !isActive ? "opacity-40" : "opacity-100"}`}
              >
                {/* Icon Wrapper */}
                <div className="relative flex items-center justify-center w-8 h-8 shrink-0 bg-[#13141b] my-0.5 rounded-full border-2 border-[#13141b]">
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse-once">
                      <CheckCircle2
                        className="w-5 h-5 text-green-500"
                        strokeWidth={3}
                      />
                    </div>
                  ) : isErrorState ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : isActive ? (
                    <div className="relative w-6 h-6">
                      <div className="absolute inset-0 rounded-full border-2 border-t-[#135bec] border-r-[#135bec]/30 border-b-[#135bec]/10 border-l-[#135bec] animate-spin" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-white/20 bg-[#13141b]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-[15px] font-medium leading-none ${isActive || isCompleted ? "text-white" : "text-gray-500"}`}
                    >
                      {step.label}
                    </p>
                    {isActive && (
                      <span className="text-[10px] font-bold text-[#135bec] bg-[#135bec]/10 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        Processing
                      </span>
                    )}
                  </div>

                  {/* Subtext with smooth expand animation */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      (isActive && step.subtext) || isErrorState
                        ? "grid-rows-[1fr] opacity-100 mt-2"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p
                        className={`text-xs ${isErrorState ? "text-red-400" : "text-gray-400"}`}
                      >
                        {isErrorState
                          ? step.subtext
                          : step.subtext || "Waiting for confirmation..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {currentHash && (
          <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-center">
            <a
              href={`https://sepolia.etherscan.io/tx/${currentHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-[#135bec] hover:text-[#3b82f6] transition-colors group"
            >
              View on Explorer
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        )}

        {/* Success/Error Footer Action */}
        {(isComplete || isError) && (
          <div className="p-4 pt-0">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all active:scale-[0.98]"
            >
              {isError ? "Close & Try Again" : "Done"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

const formatNumber = (val: string | number, decimals = 2) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function Deposit() {
  const { address, status } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [selectedNetwork, setSelectedNetwork] = useState<Network>("arc");
  const [amountInput, setAmountInput] = useState("");

  const [userState, setUserState] = useState<UserState>({
    auraBalance: "0",
    USDCBalance: "0",
    totalDeposited: "0",
    userValue: "0",
  });

  // Transaction Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalSteps, setModalSteps] = useState<Step[]>([]);
  const [currentTxHash, setCurrentTxHash] = useState<string | undefined>();

  const updateStepStatus = (
    id: string,
    status: Step["status"],
    subtext?: string,
  ) => {
    setModalSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, status, subtext } : step,
      ),
    );
  };

  /* --------------------------------------------------
     DATA FETCHING
  -------------------------------------------------- */

  const fetchUserData = useCallback(async () => {
    if (!address) return;
    try {
      // Determine USDC address based on chain
      // Sepolia: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
      // Arc: USDC (0x36...)
      const currentUsdcAddress =
        chainId === 11155111
          ? "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
          : USDC;

      const balance = (await readContract(config, {
        address: currentUsdcAddress,
        abi: VIRTUAL_USDC_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      // Always fetch vault position regardless of chain
      // If not on Arc, use public client to read Arc data
      let totalDeposited = 0n;
      let totalValue = 0n;

      if (chainId === 5042002) {
        const position = (await readContract(config, {
          address: VAULT,
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
        [, , , , , , totalValue, totalDeposited] = position;
      } else {
        // Use public client to fetch Arc data if on Sepolia
        const publicClient = createPublicClient({
          chain: arcTestnet,
          transport: http(),
        });

        try {
          const position = (await publicClient.readContract({
            address: VAULT,
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
          [, , , , , , totalValue, totalDeposited] = position;
        } catch (e) {
          console.error("Failed to fetch vault data via public client", e);
        }
      }

      setUserState({
        USDCBalance: formatUnits(balance, 6),
        totalDeposited: formatUnits(totalDeposited, 6),
        userValue: formatUnits(totalValue, 6),
        auraBalance: formatUnits(totalValue, 6),
      });
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  }, [address, chainId]);

  /* --------------------------------------------------
     NETWORK SWITCH
  -------------------------------------------------- */

  const handleSwitchNetwork = useCallback(
    async (network: Network) => {
      const target = network === "arc" ? 5042002 : 11155111;
      setSelectedNetwork(network);
      if (chainId !== target) {
        await switchChain({ chainId: target });
      }
    },
    [chainId, switchChain],
  );

  /* --------------------------------------------------
     GATEWAY DEPOSIT (FIXED)
  -------------------------------------------------- */

  const handleGatewayDeposit = useCallback(async () => {
    if (!address || !amountInput) return;

    const gateway = getGatewayConfig(11155111);
    if (!gateway) return;

    // Reset Modal
    setModalTitle("Deposit from Sepolia");
    setModalSteps([
      { id: "approve", label: "Approve Gateway", status: "idle" },
      { id: "deposit", label: "Deposit to Gateway", status: "idle" },
      { id: "index", label: "Wait for Indexing", status: "idle" },
      { id: "sign", label: "Sign Burn Intent", status: "idle" },
      { id: "mint", label: "Mint on Arc", status: "idle" },
      { id: "vault", label: "Deposit to Vault", status: "idle" },
    ]);
    setModalOpen(true);
    setLoading(true);

    try {
      if (getChainId(config) !== 11155111) {
        await switchChain({ chainId: 11155111 });
        while (getChainId(config) !== 11155111) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const amount = parseUnits(amountInput, 6);

      /* ---------- Approve ---------- */
      updateStepStatus("approve", "loading");

      const allowance = (await readContract(config, {
        address: gateway.usdcAddress,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, gateway.walletAddress],
        chainId: 11155111,
      })) as bigint;

      if (allowance < amount) {
        const tx = await writeContract(config, {
          address: gateway.usdcAddress,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [gateway.walletAddress, amount],
          chainId: 11155111,
        });
        setCurrentTxHash(tx);
        await waitForTransactionReceipt(config, {
          hash: tx,
          chainId: 11155111,
        });
      }
      updateStepStatus("approve", "success");

      /* ---------- Deposit to Gateway Wallet ---------- */
      updateStepStatus("deposit", "loading");

      // Call the Gateway Wallet's deposit function (not direct transfer!)
      const tx = await writeContract(config, {
        address: gateway.walletAddress,
        abi: GATEWAY_WALLET_ABI,
        functionName: "deposit",
        args: [gateway.usdcAddress, amount],
        chainId: 11155111,
      });
      setCurrentTxHash(tx);

      await waitForTransactionReceipt(config, {
        hash: tx,
        timeout: 60_000, // 60 second timeout
        chainId: 11155111,
      });
      updateStepStatus("deposit", "success");

      /* ---------- Wait for Indexing ---------- */
      updateStepStatus(
        "index",
        "loading",
        "Waiting for Sepolia finality (approx 90s)...",
      );

      // Wait for Circle Gateway to index the deposit (Sepolia requires finality ~65 blocks)
      await new Promise((resolve) => setTimeout(resolve, 90000));
      updateStepStatus("index", "success");

      toast.loading("Creating cross-chain transfer intent...");

      /* ---------- EIP-712 ---------- */
      updateStepStatus(
        "sign",
        "loading",
        "Please sign the burn intent in your wallet",
      );

      const salt = pad(toHex(BigInt(Date.now())), { size: 32 });

      // EIP-712 Domain (per Circle docs - no chainId or verifyingContract)
      const domain = {
        name: "GatewayWallet",
        version: "1",
      } as const;

      const types = {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
        ],
        TransferSpec: [
          { name: "version", type: "uint32" },
          { name: "sourceDomain", type: "uint32" },
          { name: "destinationDomain", type: "uint32" },
          { name: "sourceContract", type: "bytes32" },
          { name: "destinationContract", type: "bytes32" },
          { name: "sourceToken", type: "bytes32" },
          { name: "destinationToken", type: "bytes32" },
          { name: "sourceDepositor", type: "bytes32" },
          { name: "destinationRecipient", type: "bytes32" },
          { name: "sourceSigner", type: "bytes32" },
          { name: "destinationCaller", type: "bytes32" },
          { name: "value", type: "uint256" },
          { name: "salt", type: "bytes32" },
          { name: "hookData", type: "bytes" },
        ],
        BurnIntent: [
          { name: "maxBlockHeight", type: "uint256" },
          { name: "maxFee", type: "uint256" },
          { name: "spec", type: "TransferSpec" },
        ],
      } as const;

      // Helper to convert address to bytes32 (per Circle docs)
      const addressToBytes32 = (addr: `0x${string}`): `0x${string}` => {
        return pad(addr.toLowerCase() as `0x${string}`, { size: 32 });
      };

      // Build the burn intent with ALL addresses as bytes32
      const burnIntent = {
        maxBlockHeight: maxUint256,
        maxFee: 2_050000n, // Circle Gateway fee: 2.05 USDC (updated from 2.01)
        spec: {
          version: 1,
          sourceDomain: gateway.domainId,
          destinationDomain: 26,
          sourceContract: addressToBytes32(gateway.walletAddress),
          destinationContract: addressToBytes32(gateway.minterAddress), // Use minter address for destination
          sourceToken: addressToBytes32(gateway.usdcAddress),
          destinationToken: addressToBytes32(USDC),
          sourceDepositor: addressToBytes32(address!),
          destinationRecipient: addressToBytes32(address!),
          sourceSigner: addressToBytes32(address!),
          destinationCaller: addressToBytes32(
            "0x0000000000000000000000000000000000000000",
          ),
          value: amount,
          salt,
          hookData: "0x" as `0x${string}`,
        },
      };

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "BurnIntent",
        message: burnIntent,
      });
      updateStepStatus("sign", "success");

      /* ---------- API Polling ---------- */
      updateStepStatus("mint", "loading", "Submitting to Gateway & Minting...");

      /* ---------- API ---------- */
      updateStepStatus("mint", "loading", "Submitting to Gateway & Minting...");

      // Send the burn intent to Gateway API
      const res = await fetch(`${GATEWAY_API_URL}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ burnIntent, signature }], (_, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gateway API error: ${res.status} ${errorText}`);
      }

      const apiResponse = await res.json();
      console.log("Gateway API response:", apiResponse);

      const attestation = apiResponse?.attestation;
      const operatorSig = apiResponse?.signature;

      if (!attestation || !operatorSig) {
        throw new Error("Missing attestation or signature in Gateway response");
      }

      /* ---------- Mint on Destination Chain (Arc) ---------- */

      // Switch to Arc for minting
      if ((chainId as number) !== 5042002) {
        await switchChain({ chainId: 5042002 });
        // Wait for chain switch to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Check Arc Gas Balance
      const arcBalance = await getBalance(config, {
        address: address!,
        chainId: 5042002,
      });

      if (arcBalance.value === 0n) {
        throw new Error(
          "Insufficient Arc ETH (Gas) to pay for Minting. Please get gas from faucet.",
        );
      }

      const arcGateway = getGatewayConfig(5042002);
      if (!arcGateway) throw new Error("Arc Gateway config not found");

      // Gateway Minter ABI
      const GATEWAY_MINTER_ABI = [
        {
          type: "function",
          name: "gatewayMint",
          inputs: [
            { name: "attestationPayload", type: "bytes" },
            { name: "signature", type: "bytes" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ] as const;

      const mintTx = await writeContract(config, {
        address: arcGateway.minterAddress,
        abi: GATEWAY_MINTER_ABI,
        functionName: "gatewayMint",
        args: [attestation as `0x${string}`, operatorSig as `0x${string}`],
        chainId: 5042002, // Explicitly specify Arc chain
      });

      await waitForTransactionReceipt(config, {
        hash: mintTx,
        chainId: 5042002,
      });
      updateStepStatus("mint", "success");

      toast.success(`Bridge complete! Minted ${formatUnits(amount, 6)} USDC`);

      /* ---------- Auto-Deposit to Vault ---------- */
      updateStepStatus("vault", "loading", "Depositing into Aura Vault...");

      // Arc USDC Address (from ENV)
      const arcUsdc = USDC;

      // Deduct 2 USDC fee for gateway
      const fee = parseUnits("2", 6);
      if (amount <= fee) {
        throw new Error(
          "Deposit amount must be greater than 2 USDC to cover gateway fees",
        );
      }
      const depositAmount = amount - fee;

      // Check Allowance
      const vaultAllowance = (await readContract(config, {
        address: arcUsdc,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, VAULT],
        chainId: 5042002,
      })) as bigint;

      if (vaultAllowance < depositAmount) {
        const approveTx = await writeContract(config, {
          address: arcUsdc,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [VAULT, depositAmount],
          chainId: 5042002,
        });
        await waitForTransactionReceipt(config, {
          hash: approveTx,
          chainId: 5042002,
        });
      }

      // Deposit
      const depositTx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "deposit",
        args: [depositAmount],
        chainId: 5042002,
      });
      await waitForTransactionReceipt(config, {
        hash: depositTx,
        chainId: 5042002,
      });
      updateStepStatus("vault", "success");

      toast.success(
        `Success! Deposited ${formatUnits(depositAmount, 6)} vUSDC into Vault`,
      );
      setAmountInput("");

      // Refresh user data
      await fetchUserData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message);
      // Mark current step as error
      setModalSteps((prev) => {
        const errIndex = prev.findIndex((s) => s.status === "loading");
        if (errIndex !== -1) {
          const newSteps = [...prev];
          newSteps[errIndex].status = "error";
          newSteps[errIndex].subtext = e.message;
          return newSteps;
        }
        return prev;
      });
    } finally {
      setLoading(false);
      // Don't close modal automatically on success, let user admire the checkmarks
    }
  }, [
    address,
    amountInput,
    chainId,
    signTypedDataAsync,
    switchChain,
    fetchUserData,
  ]);

  /* --------------------------------------------------
     DATA FETCHING
  -------------------------------------------------- */

  // Deposit to Vault (Standard)
  const handleDeposit = useCallback(async () => {
    if (!address || !amountInput) return;

    // Reset Modal
    setModalTitle("Deposit to Vault");
    setModalSteps([
      { id: "approve", label: "Approve USDC", status: "idle" },
      { id: "deposit", label: "Deposit to Vault", status: "idle" },
    ]);
    setModalOpen(true);
    setLoading(true);

    try {
      // Ensure we are on Arc Testnet
      if (chainId !== 5042002) {
        await switchChain({ chainId: 5042002 });
        // rapid switch might need a small delay or retries, but strictly speaking await should work
      }

      const amount = parseUnits(amountInput, 6);

      updateStepStatus("approve", "loading");
      const allowance = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, VAULT],
        chainId: 5042002, // Explicitly specify chain
      })) as bigint;

      if (allowance < amount) {
        const approveTx = await writeContract(config, {
          address: USDC,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [VAULT, amount],
          chainId: 5042002, // Explicitly specify chain
        });
        setCurrentTxHash(approveTx);
        await waitForTransactionReceipt(config, {
          hash: approveTx,
          chainId: 5042002,
        });
      }
      updateStepStatus("approve", "success");

      updateStepStatus("deposit", "loading");
      const tx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "deposit",
        args: [amount],
        chainId: 5042002, // Explicitly specify chain
      });
      setCurrentTxHash(tx);
      await waitForTransactionReceipt(config, { hash: tx, chainId: 5042002 });
      updateStepStatus("deposit", "success");

      toast.success(`Deposited ${formatNumber(amountInput)} vUSDC`);
      setAmountInput("");
      await fetchUserData();
    } catch (err: any) {
      console.error(err);
      toast.error("Deposit failed");
      setModalSteps((prev) => {
        const errIndex = prev.findIndex((s) => s.status === "loading");
        if (errIndex !== -1) {
          const newSteps = [...prev];
          newSteps[errIndex].status = "error";
          newSteps[errIndex].subtext = err.message;
          return newSteps;
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [address, amountInput, fetchUserData, chainId, switchChain]);

  // Withdraw from Vault
  const handleWithdraw = useCallback(async () => {
    if (!address || !amountInput || parseFloat(amountInput) <= 0) return;

    setModalTitle("Withdraw from Vault");
    setModalSteps([
      { id: "withdraw", label: "Withdraw from Vault", status: "idle" },
    ]);
    setModalOpen(true);
    setLoading(true);

    try {
      if (chainId !== 5042002) {
        await switchChain({ chainId: 5042002 });
      }

      const inputAmount = parseUnits(amountInput, 6);
      const totalValue = parseUnits(userState.userValue, 6);

      updateStepStatus("withdraw", "loading");

      let tx;
      if (inputAmount >= totalValue) {
        tx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawAll",
          gas: 5_000_000n,
          chainId: 5042002,
        });
      } else {
        const percentageBps = (inputAmount * 10000n) / totalValue;
        tx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawPartial",
          args: [percentageBps],
          gas: 5_000_000n,
          chainId: 5042002,
        });
      }
      setCurrentTxHash(tx);
      await waitForTransactionReceipt(config, { hash: tx, chainId: 5042002 });
      updateStepStatus("withdraw", "success");

      toast.success(`Withdrew ${formatNumber(amountInput)} vUSDC`);
      setAmountInput("");
      await fetchUserData();
    } catch (err: any) {
      toast.error("Withdrawal failed");
      console.error(err);
      setModalSteps((prev) => {
        const errIndex = prev.findIndex((s) => s.status === "loading");
        if (errIndex !== -1) {
          const newSteps = [...prev];
          newSteps[errIndex].status = "error";
          newSteps[errIndex].subtext = err.message;
          return newSteps;
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [
    address,
    amountInput,
    userState.userValue,
    fetchUserData,
    chainId,
    switchChain,
  ]);

  // Withdraw from Vault AND Bridge to Sepolia
  const handleWithdrawAndBridge = useCallback(async () => {
    if (!address || !amountInput || parseFloat(amountInput) <= 0) return;
    const gateway = getGatewayConfig(5042002); // Arc

    // Reset Modal
    setModalTitle("Withdraw & Bridge to Sepolia");
    setModalSteps([
      { id: "withdraw", label: "Withdraw from Vault", status: "idle" },
      { id: "approve", label: "Approve Gateway", status: "idle" },
      { id: "deposit", label: "Deposit to Gateway", status: "idle" },
      { id: "index", label: "Wait for Indexing", status: "idle" },
      { id: "sign", label: "Sign Burn Intent", status: "idle" },
      { id: "mint", label: "Mint on Sepolia", status: "idle" },
    ]);
    setModalOpen(true);
    setLoading(true);

    try {
      if (getChainId(config) !== 5042002) {
        await switchChain({ chainId: 5042002 });
        while (getChainId(config) !== 5042002) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      const amount = parseUnits(amountInput, 6);

      // Always withdraw from Vault first (Withdraw Step)
      updateStepStatus("withdraw", "loading");
      const totalValue = parseUnits(userState.userValue, 6);

      if (totalValue < amount) throw new Error("Insufficient Vault funds");

      let vaultTx;
      if (amount >= totalValue) {
        vaultTx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawAll",
          gas: 5_000_000n,
          chainId: 5042002,
        });
      } else {
        const percentageBps = (amount * 10000n) / totalValue;
        const bps = percentageBps > 10000n ? 10000n : percentageBps;
        vaultTx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawPartial",
          args: [bps],
          gas: 5_000_000n,
          chainId: 5042002,
        });
      }
      await waitForTransactionReceipt(config, {
        hash: vaultTx,
        chainId: 5042002,
      });
      updateStepStatus("withdraw", "success");

      if (!gateway) throw new Error("Gateway config not found");

      // Approve Gateway
      updateStepStatus("approve", "loading");
      const allowance = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, gateway.walletAddress],
        chainId: 5042002,
      })) as bigint;

      if (allowance < amount) {
        const tx = await writeContract(config, {
          address: USDC,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [gateway.walletAddress, amount],
          chainId: 5042002,
        });
        await waitForTransactionReceipt(config, { hash: tx, chainId: 5042002 });
      }
      updateStepStatus("approve", "success");

      /* ---------- Deposit to Gateway Wallet ---------- */
      updateStepStatus("deposit", "loading");

      const tx = await writeContract(config, {
        address: gateway.walletAddress,
        abi: GATEWAY_WALLET_ABI,
        functionName: "deposit",
        args: [gateway.usdcAddress, amount],
        chainId: 5042002,
      });
      setCurrentTxHash(tx);

      await waitForTransactionReceipt(config, {
        hash: tx,
        timeout: 60_000,
        chainId: 5042002,
      });
      updateStepStatus("deposit", "success");

      /* ---------- Wait for Indexing ---------- */
      updateStepStatus(
        "index",
        "loading",
        "Circle Gateway is indexing (approx 10s)...",
      );
      // Arc is fast, indexing happens quickly
      await new Promise((resolve) => setTimeout(resolve, 10000));
      updateStepStatus("index", "success");

      toast.loading("Creating cross-chain transfer intent...");

      /* ---------- EIP-712 ---------- */
      updateStepStatus(
        "sign",
        "loading",
        "Please sign the burn intent in your wallet",
      );

      const salt = pad(toHex(BigInt(Date.now())), { size: 32 });
      const domain = { name: "GatewayWallet", version: "1" } as const;
      const types = {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
        ],
        TransferSpec: [
          { name: "version", type: "uint32" },
          { name: "sourceDomain", type: "uint32" },
          { name: "destinationDomain", type: "uint32" },
          { name: "sourceContract", type: "bytes32" },
          { name: "destinationContract", type: "bytes32" },
          { name: "sourceToken", type: "bytes32" },
          { name: "destinationToken", type: "bytes32" },
          { name: "sourceDepositor", type: "bytes32" },
          { name: "destinationRecipient", type: "bytes32" },
          { name: "sourceSigner", type: "bytes32" },
          { name: "destinationCaller", type: "bytes32" },
          { name: "value", type: "uint256" },
          { name: "salt", type: "bytes32" },
          { name: "hookData", type: "bytes" },
        ],
        BurnIntent: [
          { name: "maxBlockHeight", type: "uint256" },
          { name: "maxFee", type: "uint256" },
          { name: "spec", type: "TransferSpec" },
        ],
      } as const;

      // Helper to convert address to bytes32 (per Circle docs)
      const addressToBytes32 = (addr: `0x${string}`): `0x${string}` => {
        return pad(addr.toLowerCase() as `0x${string}`, { size: 32 });
      };

      const sepoliaGateway = getGatewayConfig(11155111);
      if (!sepoliaGateway) throw new Error("Sepolia Gateway config not found");

      // Build the burn intent for Arc -> Sepolia
      const burnIntent = {
        maxBlockHeight: maxUint256,
        maxFee: 2_050000n, // 2.05 USDC
        spec: {
          version: 1,
          sourceDomain: 26, // Arc
          destinationDomain: 0, // Sepolia
          sourceContract: addressToBytes32(gateway.walletAddress),
          destinationContract: addressToBytes32(sepoliaGateway.minterAddress), // Destination Minter (Sepolia)
          sourceToken: addressToBytes32(gateway.usdcAddress),
          destinationToken: addressToBytes32(
            "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
          ), // Sepolia USDC
          sourceDepositor: addressToBytes32(address!),
          destinationRecipient: addressToBytes32(address!),
          sourceSigner: addressToBytes32(address!),
          destinationCaller: addressToBytes32(
            "0x0000000000000000000000000000000000000000",
          ),
          value: amount,
          salt,
          hookData: "0x" as `0x${string}`,
        },
      };

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "BurnIntent",
        message: burnIntent,
      });
      updateStepStatus("sign", "success");

      /* ---------- API ---------- */
      updateStepStatus("mint", "loading", "Submitting to Gateway & Minting...");

      const res = await fetch(`${GATEWAY_API_URL}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ burnIntent, signature }], (_, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gateway API error: ${res.status} ${errorText}`);
      }

      const apiResponse = await res.json();
      const attestation = apiResponse?.attestation;
      const operatorSig = apiResponse?.signature;

      if (!attestation || !operatorSig) {
        throw new Error("Missing attestation or signature in Gateway response");
      }

      /* ---------- Mint on Destination Chain (Sepolia) ---------- */

      if (getChainId(config) !== 11155111) {
        await switchChain({ chainId: 11155111 });
        while (getChainId(config) !== 11155111) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Check Sepolia Gas Balance
      const sepoliaBalance = await getBalance(config, {
        address: address!,
        chainId: 11155111,
      });

      if (sepoliaBalance.value === 0n) {
        throw new Error(
          "Insufficient Sepolia ETH to pay for Minting. Please get ETH from a faucet.",
        );
      }

      // Gateway Minter ABI (same as above)
      const GATEWAY_MINTER_ABI = [
        {
          type: "function",
          name: "gatewayMint",
          inputs: [
            { name: "attestationPayload", type: "bytes" },
            { name: "signature", type: "bytes" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ] as const;

      const mintTx = await writeContract(config, {
        address: sepoliaGateway.minterAddress,
        abi: GATEWAY_MINTER_ABI,
        functionName: "gatewayMint",
        args: [attestation as `0x${string}`, operatorSig as `0x${string}`],
        chainId: 11155111,
      });

      await waitForTransactionReceipt(config, {
        hash: mintTx,
        chainId: 11155111,
      });
      updateStepStatus("mint", "success");

      toast.success(
        `Bridge complete! Minted ${formatUnits(amount, 6)} USDC on Sepolia`,
      );
      setAmountInput("");
      await fetchUserData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message);
      // Mark error in modal
      setModalSteps((prev) => {
        const errIndex = prev.findIndex((s) => s.status === "loading");
        if (errIndex !== -1) {
          const newSteps = [...prev];
          newSteps[errIndex].status = "error";
          newSteps[errIndex].subtext = e.message;
          return newSteps;
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [
    address,
    amountInput,
    chainId,
    switchChain,
    userState,
    fetchUserData,
    signTypedDataAsync,
  ]);

  const quickAmounts = ["100", "500", "1000", "5000"];
  const quickLabels = ["$100", "$500", "$1k", "$5k"];

  useEffect(() => {
    if (address) {
      fetchUserData();
      const interval = setInterval(() => {
        fetchUserData();
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [address, fetchUserData]);

  const handleHarvest = async () => {
    if (!address) return;
    setLoading(true);
    const toastId = toast.loading("Harvesting...");
    try {
      const tx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "harvestAll",
        account: address,
        gas: 5_000_000n,
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("Harvested!", { id: toastId });
      await fetchUserData();
    } catch (err) {
      toast.error("Harvest failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleRebalance = async () => {
    if (!address) return;
    setLoading(true);
    const toastId = toast.loading("Rebalancing...");
    try {
      const tx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "rebalance",
        args: [address],
        account: address,
        gas: 5_000_000n,
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success("Rebalanced!", { id: toastId });
      await fetchUserData();
    } catch (err) {
      toast.error("Rebalance failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (
    status === "disconnected" ||
    (!address && status !== "reconnecting" && status !== "connecting")
  ) {
    return (
      <DefaultLayout>
        <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#16181D] flex items-center justify-center mx-auto mb-4 border border-white/5">
              <Wallet className="w-8 h-8 text-[#135bec]" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-white">
              Connect Wallet
            </h1>
            <p className="text-gray-500">
              Connect your wallet to deposit & withdraw
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  // If we are connecting/reconnecting, show a simple loader to avoid null address errors
  if (!address) {
    return (
      <DefaultLayout>
        <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
          <div className="animate-pulse text-white">Connecting wallet...</div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        steps={modalSteps}
        currentHash={currentTxHash}
      />
      <div className="flex flex-col lg:flex-row min-h-screen relative overflow-hidden font-sans">
        {/* LEFT PANEL: Total Balance & Withdraw */}
        <section className="flex-1 bg-[#0B0C10] flex flex-col justify-center items-center relative p-8 lg:p-20 border-b lg:border-b-0 lg:border-r border-white/5">
          {/* Subtle radial background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(19,91,236,0.03),transparent_40%)] pointer-events-none" />

          <div className="w-full max-w-md flex flex-col gap-8 z-0 relative">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xl">🔷</span>
                <span className="uppercase tracking-widest text-xs font-semibold">
                  Total Deposited
                </span>
              </div>

              <div className="relative">
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-white">
                  ${formatNumber(userState.userValue)}
                </h1>

                {/* Visual placeholder watermark */}
                <div className="absolute -right-4 -top-2 lg:-right-8 lg:-top-4 opacity-50">
                  <span className="text-[48px] lg:text-[64px] text-white/5 -rotate-12 select-none">
                    $
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <p className="text-gray-500 text-sm mb-4">
                Funds are available for withdrawal instantly.
              </p>
              <button
                onClick={() => {
                  setActiveTab(
                    activeTab === "deposit" ? "withdraw" : "deposit",
                  );
                  setAmountInput("");
                }}
                className="w-full sm:w-auto h-14 px-8 rounded-xl border border-white/20 text-white font-bold hover:bg-white/5 hover:border-white/40 active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <span>
                  {activeTab === "deposit"
                    ? "Withdraw Funds"
                    : "Initialize Deposit"}
                </span>
                {activeTab === "deposit" ? (
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                ) : (
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
              </button>
              <div className="glass-panel rounded-2xl p-8 mt-8">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  {/* Harvest Button */}
                  {/* <button
                    onClick={handleHarvest}
                    disabled={loading}
                    className="group relative overflow-hidden bg-gradient-to-r from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-500/40 rounded-xl p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-white mb-1">
                          Harvest Yield
                        </h4>
                        <p className="text-sm text-gray-400">
                          Collect accumulated yield from all vaults
                        </p>
                      </div>
                      <Gift className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform" />
                    </div>
                  </button> */}

                  {/* Rebalance Button */}
                  <button
                    onClick={handleRebalance}
                    disabled={loading}
                    className="group relative overflow-hidden bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-white mb-1">
                          Rebalance (instant)
                        </h4>
                        <p className="text-sm text-gray-400">
                          Update allocation to match risk profile
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Add Funds */}
        <section className="flex-1 bg-[#16181D] flex flex-col justify-center items-center relative p-8 lg:p-20">
          {/* Background decoration */}
          <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

          <div className="w-full max-w-md flex flex-col gap-8 z-0 relative">
            {/* Promo Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 p-6 shadow-2xl group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Gift className="w-32 h-32 text-[#135bec] -rotate-12 translate-x-8 -translate-y-8" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#135bec] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Get USDC
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Get Arc Testnet USDC
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Get real USDC on Arc testnet from Circle's faucet to start
                  testing.
                </p>
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 bg-white text-[#0B0C10] text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 w-fit"
                >
                  <Plus className="w-4 h-4 bg-[#0B0C10] text-white rounded-full p-0.5" />
                  Get USDC from Faucet
                </a>
              </div>
            </div>

            {/* Deposit Form */}
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <label className="uppercase tracking-widest text-xs font-semibold text-gray-400">
                  {activeTab === "deposit"
                    ? "Deposit Amount"
                    : "Withdraw Amount"}
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>
                    {activeTab === "deposit" ? "Wallet:" : "Available:"}
                  </span>
                  <span className="font-mono text-white">
                    {activeTab === "deposit"
                      ? `$${formatNumber(userState.USDCBalance)}`
                      : `${formatNumber(userState.auraBalance)} AURA`}
                  </span>
                </div>
              </div>

              {/* Network Selector */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-lg mb-2">
                <button
                  onClick={() => handleSwitchNetwork("arc")}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    selectedNetwork === "arc"
                      ? "bg-[#135bec] text-white shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Arc Testnet
                </button>
                <button
                  onClick={() => handleSwitchNetwork("sepolia")}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    selectedNetwork === "sepolia"
                      ? "bg-[#135bec] text-white shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Sepolia
                </button>
              </div>

              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-xl font-medium">
                    {activeTab === "deposit" ? "$" : "✧"}
                  </span>
                </div>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="block w-full pl-10 pr-24 py-5 bg-black/20 border border-white/10 rounded-xl text-3xl font-bold text-white placeholder-gray-600 focus:ring-2 focus:ring-[#135bec] focus:border-transparent transition-all outline-none"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    onClick={() =>
                      setAmountInput(
                        activeTab === "deposit"
                          ? userState.USDCBalance
                          : userState.auraBalance,
                      )
                    }
                    className="bg-white/5 hover:bg-white/10 text-[#135bec] text-xs font-bold py-1.5 px-3 rounded-lg border border-white/5 transition-colors uppercase tracking-wider"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quickAmounts.map((amount, idx) => (
                  <button
                    key={amount}
                    onClick={() => setAmountInput(amount)}
                    className="py-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 transition-colors"
                  >
                    {quickLabels[idx]}
                  </button>
                ))}
              </div>

              {/* Deposit Action */}
              <button
                onClick={async () => {
                  if (activeTab === "deposit") {
                    if (selectedNetwork === "sepolia") {
                      await handleGatewayDeposit();
                    } else {
                      await handleDeposit();
                    }
                  } else {
                    if (selectedNetwork === "sepolia") {
                      // Gateway Withdraw: Withdraw from Vault -> Gateway Bridge (BurnIntent)
                      await handleWithdrawAndBridge();
                    } else {
                      await handleWithdraw();
                    }
                  }
                }}
                disabled={
                  loading || !amountInput || parseFloat(amountInput) <= 0
                }
                className={`w-full h-14 text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(19,91,236,0.15)] hover:shadow-[0_0_30px_rgba(19,91,236,0.3)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                  activeTab === "deposit"
                    ? "bg-[#135bec] text-white hover:bg-[#1152d6]"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
              >
                {activeTab === "deposit" ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <TrendingUp className="w-5 h-5" />
                )}
                {activeTab === "deposit"
                  ? "Deposit to Vault"
                  : "Withdraw Assets"}
              </button>

              <p className="text-center text-xs text-gray-500 mt-2">
                No lock-up period. Withdraw anytime.
              </p>
            </div>
          </div>

          {/* Action Buttons Section */}
        </section>
      </div>
    </DefaultLayout>
  );
}
