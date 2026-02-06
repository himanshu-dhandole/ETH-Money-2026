"use client";

import { useState, useEffect, useCallback } from "react";
import {
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
} from "lucide-react";
import { formatUnits, parseUnits, pad, toHex, maxUint256, createPublicClient, http } from "viem";
import {
  useSwitchChain,
  useChainId,
  useSignTypedData,
} from "wagmi";
import {
  getGatewayConfig,
  GATEWAY_API_URL,
} from "@/config/gateway";

/* --------------------------------------------------
   ENV
-------------------------------------------------- */

const USDC = import.meta.env
  .VITE_VIRTUAL_USDC_ADDRESS as `0x${string}`;
const VAULT = import.meta.env
  .VITE_VAULT_ROUTER_ADDRESS as `0x${string}`;

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
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] =
    useState<"deposit" | "withdraw">("deposit");
  const [selectedNetwork, setSelectedNetwork] =
    useState<Network>("arc");
  const [amountInput, setAmountInput] = useState("");

  const [userState, setUserState] = useState<UserState>({
    auraBalance: "0",
    USDCBalance: "0",
    totalDeposited: "0",
    userValue: "0",
  });
  const [gatewayBalances, setGatewayBalances] = useState<{
    total: number;
    maxTransferable: number;
    balances: Array<{ chain: string; amount: number }>;
  } | null>(null);

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
     GATEWAY BALANCE CHECK
  -------------------------------------------------- */

  const GATEWAY_DOMAINS = {
    sepolia: 0,
    avalancheFuji: 1,
    baseSepolia: 6,
    arcTestnet: 26,
    hyperliquidEvmTestnet: 19,
    seiTestnet: 16,
    sonicTestnet: 13,
    worldchainSepolia: 14,
  };

  const checkGatewayBalances = useCallback(async () => {
    if (!address) return;

    const toastId = toast.loading("Checking Gateway balances...");

    try {
      const body = {
        token: "USDC",
        sources: Object.entries(GATEWAY_DOMAINS).map(([_, domain]) => ({
          domain,
          depositor: address,
        })),
      };

      const res = await fetch(
        "https://gateway-api-testnet.circle.com/v1/balances",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Gateway API error: ${res.status} ${error}`);
      }

      const result = await res.json();

      let total = 0;
      const balances = [];

      for (const balance of result.balances) {
        const chain =
          Object.keys(GATEWAY_DOMAINS).find(
            (key) => GATEWAY_DOMAINS[key as keyof typeof GATEWAY_DOMAINS] === balance.domain,
          ) || `Domain ${balance.domain}`;
        const amount = parseFloat(balance.balance);

        if (amount > 0) {
          balances.push({ chain, amount });
        }
        total += amount;
      }

      const maxFee = 2.01;
      const maxTransferable = Math.max(0, total - maxFee);

      setGatewayBalances({ total, maxTransferable, balances });

      console.log("=".repeat(50));
      console.log("Gateway Wallet Balances:");
      console.log("=".repeat(50));
      balances.forEach(b => {
        console.log(`${b.chain.padEnd(25)}: ${b.amount.toFixed(6)} USDC`);
      });
      console.log("=".repeat(50));
      console.log(`Total: ${total.toFixed(6)} USDC`);
      console.log(`Max Transferable: ${maxTransferable.toFixed(6)} USDC (after 2.01 fee)`);
      console.log("=".repeat(50));

      toast.success(`Total Gateway Balance: ${total.toFixed(2)} USDC`, { id: toastId });
    } catch (error: any) {
      console.error("Gateway balance check error:", error);
      toast.error(error.message || "Failed to check balances", { id: toastId });
    }
  }, [address]);

  /* --------------------------------------------------
     GATEWAY DEPOSIT (FIXED)
  -------------------------------------------------- */

  const handleGatewayDeposit = useCallback(async () => {
    if (!address || !amountInput) return;

    const gateway = getGatewayConfig(11155111);
    if (!gateway) return;

    setLoading(true);
    const toastId = toast.loading("Gateway deposit...");

    try {
      if (chainId !== 11155111) {
        await switchChain({ chainId: 11155111 });
        throw new Error("Switched to Sepolia. Retry.");
      }

      const amount = parseUnits(amountInput, 6);

      /* ---------- Approve ---------- */

      const allowance = (await readContract(config, {
        address: gateway.usdcAddress,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, gateway.walletAddress],
      })) as bigint;

      if (allowance < amount) {
        const tx = await writeContract(config, {
          address: gateway.usdcAddress,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [gateway.walletAddress, amount],
        });
        await waitForTransactionReceipt(config, { hash: tx });
      }

      /* ---------- Deposit to Gateway Wallet ---------- */

      // Call the Gateway Wallet's deposit function (not direct transfer!)
      const tx = await writeContract(config, {
        address: gateway.walletAddress,
        abi: GATEWAY_WALLET_ABI,
        functionName: "deposit",
        args: [gateway.usdcAddress, amount],
      });

      toast.loading("Waiting for deposit confirmation...", { id: toastId });
      await waitForTransactionReceipt(config, {
        hash: tx,
        timeout: 60_000, // 60 second timeout
      });

      toast.loading("Waiting for Gateway to index deposit (this may take up to 60 seconds)...", { id: toastId });

      // Wait for Circle Gateway to index the deposit - increased to 45 seconds to prevent indexing issues
      await new Promise(resolve => setTimeout(resolve, 45000)); // 45 second delay

      toast.loading("Creating cross-chain transfer intent...", { id: toastId });

      /* ---------- EIP-712 ---------- */

      const salt = pad(
        toHex(BigInt(Date.now())),
        { size: 32 },
      );

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
        maxFee: 2_010000n, // Circle Gateway fee: 2.01 USDC (matches reference implementation)
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
          destinationCaller: addressToBytes32("0x0000000000000000000000000000000000000000"),
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

      /* ---------- API ---------- */

      // Send the burn intent to Gateway API
      toast.loading("Submitting burn intent to Gateway...", { id: toastId });

      const res = await fetch(
        `${GATEWAY_API_URL}/transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            { burnIntent, signature },
          ], (_, v) => typeof v === 'bigint' ? v.toString() : v),
        },
      );

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

      toast.loading("Switching to Arc to mint USDC...", { id: toastId });

      // Switch to Arc for minting
      if ((chainId as number) !== 5042002) {
        await switchChain({ chainId: 5042002 });
        // Wait for chain switch to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
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

      toast.loading("Minting USDC on Arc...", { id: toastId });

      const mintTx = await writeContract(config, {
        address: arcGateway.minterAddress,
        abi: GATEWAY_MINTER_ABI,
        functionName: "gatewayMint",
        args: [attestation as `0x${string}`, operatorSig as `0x${string}`],
        chainId: 5042002, // Explicitly specify Arc chain
      });

      await waitForTransactionReceipt(config, { hash: mintTx });

      toast.success(`Bridge complete! Minted ${formatUnits(amount, 6)} USDC`, { id: toastId });

      /* ---------- Auto-Deposit to Vault ---------- */
      toast.loading("Auto-depositing to Vault...", { id: toastId });

      // Arc USDC Address (from ENV)
      const arcUsdc = USDC;

      // Check Allowance
      const vaultAllowance = (await readContract(config, {
        address: arcUsdc,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, VAULT],
        chainId: 5042002,
      })) as bigint;

      if (vaultAllowance < amount) {
        toast.loading("Approving Vault...", { id: toastId });
        const approveTx = await writeContract(config, {
          address: arcUsdc,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [VAULT, amount],
          chainId: 5042002,
        });
        await waitForTransactionReceipt(config, { hash: approveTx });
      }

      // Deposit
      toast.loading("Depositing to Vault...", { id: toastId });
      const depositTx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "deposit",
        args: [amount],
        chainId: 5042002,
      });
      await waitForTransactionReceipt(config, { hash: depositTx });

      toast.success(`Success! Deposited ${formatUnits(amount, 6)} vUSDC into Vault`, {
        id: toastId,
      });
      setAmountInput("");

      // Refresh user data
      await fetchUserData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message, { id: toastId });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    address,
    amountInput,
    chainId,
    signTypedDataAsync,
    switchChain,
  ]);

  /* --------------------------------------------------
     DATA FETCHING
  -------------------------------------------------- */

  const fetchUserData = useCallback(async () => {
    if (!address) return;
    try {
      // Determine USDC address based on chain
      // Sepolia: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
      // Arc: USDC (0x36...)
      const currentUsdcAddress = chainId === 11155111
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
        })) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
        [, , , , , , totalValue, totalDeposited] = position;
      } else {
        // Use public client to fetch Arc data if on Sepolia
        const publicClient = createPublicClient({
          chain: arcTestnet,
          transport: http()
        });

        try {
          const position = (await publicClient.readContract({
            address: VAULT,
            abi: VAULT_ROUTER_ABI,
            functionName: "getUserPosition",
            args: [address],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
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

  // Deposit to Vault (Standard)
  const handleDeposit = useCallback(async () => {
    if (!address || !amountInput) return;
    setLoading(true);
    const toastId = toast.loading("Preparing deposit...");
    try {
      const amount = parseUnits(amountInput, 6);
      const allowance = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, VAULT],
      })) as bigint;

      if (allowance < amount) {
        toast.loading("Approving tokens...", { id: toastId });
        const approveTx = await writeContract(config, {
          address: USDC,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [VAULT, amount],
        });
        await waitForTransactionReceipt(config, { hash: approveTx });
      }

      toast.loading("Depositing to vault...", { id: toastId });
      const tx = await writeContract(config, {
        address: VAULT,
        abi: VAULT_ROUTER_ABI,
        functionName: "deposit",
        args: [amount],
      });
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success(`Deposited ${formatNumber(amountInput)} vUSDC`, { id: toastId });
      setAmountInput("");
      await fetchUserData();
    } catch (err) {
      toast.error("Deposit failed", { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address, amountInput, fetchUserData]);

  // Withdraw from Vault
  const handleWithdraw = useCallback(async () => {
    if (!address || !amountInput || parseFloat(amountInput) <= 0) return;
    setLoading(true);
    const toastId = toast.loading("Processing withdrawal...");
    try {
      const inputAmount = parseUnits(amountInput, 6);
      const totalValue = parseUnits(userState.userValue, 6);
      let tx;
      if (inputAmount >= totalValue) {
        tx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawAll",
          gas: 5_000_000n,
        });
      } else {
        const percentageBps = (inputAmount * 10000n) / totalValue;
        tx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawPartial",
          args: [percentageBps],
          gas: 5_000_000n,
        });
      }
      await waitForTransactionReceipt(config, { hash: tx });
      toast.success(`Withdrew ${formatNumber(amountInput)} vUSDC`, { id: toastId });
      setAmountInput("");
      await fetchUserData();
    } catch (err) {
      toast.error("Withdrawal failed", { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address, amountInput, userState.userValue, fetchUserData]);

  // Withdraw from Vault AND Bridge to Sepolia
  const handleWithdrawAndBridge = useCallback(async () => {
    if (!address || !amountInput || parseFloat(amountInput) <= 0) return;
    const gateway = getGatewayConfig(5042002); // Arc
    setLoading(true);
    const toastId = toast.loading("Processing Withdraw & Bridge...");
    try {
      if (chainId !== 5042002) {
        await switchChain({ chainId: 5042002 });
        throw new Error("Switched to Arc. Please retry.");
      }
      const amount = parseUnits(amountInput, 6);


      // Always withdraw from Vault first (Withdraw Step)
      toast.loading("Withdrawing from Vault...", { id: toastId });
      const totalValue = parseUnits(userState.userValue, 6);

      if (totalValue < amount) throw new Error("Insufficient Vault funds");

      let vaultTx;
      if (amount >= totalValue) {
        vaultTx = await writeContract(config, {
          address: VAULT,
          abi: VAULT_ROUTER_ABI,
          functionName: "withdrawAll",
          gas: 5_000_000n,
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
        });
      }
      await waitForTransactionReceipt(config, { hash: vaultTx });

      if (!gateway) throw new Error("Gateway config not found");

      // Approve Gateway
      const allowance = (await readContract(config, {
        address: USDC,
        abi: VIRTUAL_USDC_ABI,
        functionName: "allowance",
        args: [address, gateway.walletAddress],
      })) as bigint;

      if (allowance < amount) {
        toast.loading("Approving Gateway...", { id: toastId });
        const tx = await writeContract(config, {
          address: USDC,
          abi: VIRTUAL_USDC_ABI,
          functionName: "approve",
          args: [gateway.walletAddress, amount],
        });
        await waitForTransactionReceipt(config, { hash: tx });
      }

      /* ---------- Deposit to Gateway Wallet ---------- */
      toast.loading("Depositing to Arc Gateway...", { id: toastId });
      const tx = await writeContract(config, {
        address: gateway.walletAddress,
        abi: GATEWAY_WALLET_ABI,
        functionName: "deposit",
        args: [gateway.usdcAddress, amount],
      });

      toast.loading("Waiting for deposit confirmation...", { id: toastId });
      await waitForTransactionReceipt(config, {
        hash: tx,
        timeout: 60_000,
      });

      toast.loading("Waiting for Gateway to index deposit (approx 45s)...", { id: toastId });
      await new Promise(resolve => setTimeout(resolve, 45000));

      toast.loading("Creating cross-chain transfer intent...", { id: toastId });

      /* ---------- EIP-712 ---------- */
      const salt = pad(toHex(BigInt(Date.now())), { size: 32 });
      const domain = { name: "GatewayWallet", version: "1" } as const;
      const types = {
        EIP712Domain: [{ name: "name", type: "string" }, { name: "version", type: "string" }],
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
        maxFee: 2_010000n, // 2.01 USDC
        spec: {
          version: 1,
          sourceDomain: 26, // Arc
          destinationDomain: 0, // Sepolia
          sourceContract: addressToBytes32(gateway.walletAddress),
          destinationContract: addressToBytes32(sepoliaGateway.minterAddress), // Destination Minter (Sepolia)
          sourceToken: addressToBytes32(gateway.usdcAddress),
          destinationToken: addressToBytes32("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"), // Sepolia USDC
          sourceDepositor: addressToBytes32(address!),
          destinationRecipient: addressToBytes32(address!),
          sourceSigner: addressToBytes32(address!),
          destinationCaller: addressToBytes32("0x0000000000000000000000000000000000000000"),
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

      /* ---------- API ---------- */
      toast.loading("Submitting burn intent to Gateway...", { id: toastId });
      const res = await fetch(`${GATEWAY_API_URL}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ burnIntent, signature }], (_, v) => typeof v === 'bigint' ? v.toString() : v),
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
      toast.loading("Switching to Sepolia to mint USDC...", { id: toastId });

      if ((chainId as number) !== 11155111) {
        await switchChain({ chainId: 11155111 });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Gateway Minter ABI (same as above)
      const GATEWAY_MINTER_ABI = [
        {
          type: "function", name: "gatewayMint",
          inputs: [{ name: "attestationPayload", type: "bytes" }, { name: "signature", type: "bytes" }],
          outputs: [], stateMutability: "nonpayable",
        },
      ] as const;

      toast.loading("Minting USDC on Sepolia...", { id: toastId });
      const mintTx = await writeContract(config, {
        address: sepoliaGateway.minterAddress,
        abi: GATEWAY_MINTER_ABI,
        functionName: "gatewayMint",
        args: [attestation as `0x${string}`, operatorSig as `0x${string}`],
        chainId: 11155111,
      });

      await waitForTransactionReceipt(config, { hash: mintTx });
      toast.success(`Bridge complete! Minted ${formatUnits(amount, 6)} USDC on Sepolia`, { id: toastId });
      setAmountInput("");
      await fetchUserData();

    } catch (e: any) {
      console.error(e);
      toast.error(e.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  }, [address, amountInput, chainId, switchChain, userState, fetchUserData, signTypedDataAsync]);

  const quickAmounts = ["100", "500", "1000", "5000"];
  const quickLabels = ["$100", "$500", "$1k", "$5k"];

  useEffect(() => {
    if (address) {
      fetchUserData();
      const interval = setInterval(() => { fetchUserData(); }, 20000);
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


  if (!address) {
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

  return (
    <DefaultLayout>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Harvest Button */}
                  <button
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
                  </button>

                  {/* Rebalance Button */}
                  <button
                    onClick={handleRebalance}
                    disabled={loading}
                    className="group relative overflow-hidden bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-white mb-1">
                          Rebalance
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

            {/* Gateway Balance Check */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/20 to-blue-800/20 border border-blue-500/20 p-6 shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Gateway Balance
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Check your USDC balance across all chains
                    </p>
                  </div>
                  <button
                    onClick={checkGatewayBalances}
                    disabled={loading || !address}
                    className="h-10 px-4 bg-[#135bec] hover:bg-[#0d4ab8] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check Balance
                  </button>
                </div>

                {gatewayBalances && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Total Balance:</span>
                      <span className="text-white font-bold">{gatewayBalances.total.toFixed(6)} USDC</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <span className="text-gray-400 text-sm">Max Transferable:</span>
                      <span className="text-green-400 font-bold">{gatewayBalances.maxTransferable.toFixed(6)} USDC</span>
                    </div>
                    {gatewayBalances.balances.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-gray-500 mb-2">Balances by chain:</p>
                        {gatewayBalances.balances.map((b) => (
                          <div key={b.chain} className="flex justify-between text-xs text-gray-400 py-1">
                            <span>{b.chain}</span>
                            <span>{b.amount.toFixed(6)} USDC</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${selectedNetwork === "arc"
                    ? "bg-[#135bec] text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                    }`}
                >
                  Arc Testnet
                </button>
                <button
                  onClick={() => handleSwitchNetwork("sepolia")}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${selectedNetwork === "sepolia"
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
                className={`w-full h-14 text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(19,91,236,0.15)] hover:shadow-[0_0_30px_rgba(19,91,236,0.3)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${activeTab === "deposit"
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
