// import { useState, useEffect } from "react";
// import VAULT_ROUTER_ABI from "@/abi/VaultRouter.json";
// import USDT_ABI from "@/abi/VirtualUSDC.json";
// import RISK_NFT_ABI from "@/abi/RiskNFT.json";
// import VAULT_ABI from "@/abi/AuraVault.json";
// // Assuming Strategy ABI is similar enough for totalAssets check, or use a generic one
// import STRATEGY_ABI from "@/abi/LeveragedYieldStrategy.json";

// import { useAccount } from "wagmi";
// import { config } from "@/config/wagmiConfig";
// import { readContract, writeContract, waitForTransactionReceipt } from "@wagmi/core";
// import DefaultLayout from "@/layouts/default";
// import { formatUnits, parseUnits } from "viem";

// // --- Configuration ---
// const VIRTUAL_USDT_ADDRESS = import.meta.env.VITE_VIRTUAL_USDT_ADDRESS as `0x${string}`;
// const RISK_NFT_ADDRESS = import.meta.env.VITE_RISK_NFT_ADDRESS as `0x${string}`;
// const VAULT_ROUTER_ADDRESS = import.meta.env.VITE_VAULT_ROUTER_ADDRESS as `0x${string}`;

// const LOW_RISK_VAULT = import.meta.env.VITE_LOW_RISK_VAULT as `0x${string}`;
// const MEDIUM_RISK_VAULT = import.meta.env.VITE_MEDIUM_RISK_VAULT as `0x${string}`;
// const HIGH_RISK_VAULT = import.meta.env.VITE_HIGH_RISK_VAULT as `0x${string}`;

// const STRATEGIES = [
//   { name: "Stables Strategy", address: import.meta.env.VITE_STRATEGY_STABLES as `0x${string}` },
//   { name: "Aave Bluechip Strategy", address: import.meta.env.VITE_STRATEGY_AAVE_BLUECHIP as `0x${string}` },
//   { name: "Bluechip Yield Strategy", address: import.meta.env.VITE_STRATEGY_BLUECHIP_YIELD as `0x${string}` },
//   { name: "Lido Strategy", address: import.meta.env.VITE_STRATEGY_LIDO as `0x${string}` },
//   { name: "rETH Strategy", address: import.meta.env.VITE_STRATEGY_RETH as `0x${string}` },
//   { name: "Curve Strategy", address: import.meta.env.VITE_STRATEGY_CURVE as `0x${string}` },
//   { name: "Meme Pools Strategy", address: import.meta.env.VITE_STRATEGY_MEME_POOLS as `0x${string}` },
//   { name: "Emerging Opps Strategy", address: import.meta.env.VITE_STRATEGY_EMERGING_OPPS as `0x${string}` },
//   { name: "Leveraged Yield Strategy", address: import.meta.env.VITE_STRATEGY_LEV_YIELD as `0x${string}` },
// ] as const;

// const GAS_SETTINGS = {
//   maxPriorityFeePerGas: 120n * 10n ** 9n,
//   maxFeePerGas: 150n * 10n ** 9n,
// };

// const Test = () => {
//   const { address, isConnected } = useAccount();
//   const [loading, setLoading] = useState<string | null>(null);
//   const [result, setResult] = useState<string>("");

//   // User Data
//   const [usdtBalance, setUsdtBalance] = useState<string>("0");
//   const [hasNFT, setHasNFT] = useState<boolean>(false);
//   const [riskProfile, setRiskProfile] = useState<any>(null);

//   // Vault Balances (Shares)
//   const [vaultBalances, setVaultBalances] = useState({ low: "0", med: "0", high: "0" });

//   // Strategy Data
//   const [strategyData, setStrategyData] = useState<Record<string, string>>({});

//   // Inputs
//   const [depositAmount, setDepositAmount] = useState<string>("100");

//   const fetchData = async () => {
//     if (!address) return;
//     try {
//       // 1. USDT Balance
//       const balance = await readContract(config, {
//         abi: USDT_ABI,
//         address: VIRTUAL_USDT_ADDRESS,
//         functionName: "balanceOf",
//         args: [address],
//       });
//       setUsdtBalance(formatUnits(balance as bigint, 18));

//       // 2. Risk NFT
//       const hasHeader = await readContract(config, {
//         abi: RISK_NFT_ABI,
//         address: RISK_NFT_ADDRESS,
//         functionName: "hasProfile",
//         args: [address],
//       });
//       setHasNFT(Boolean(hasHeader));

//       if (hasHeader) {
//         const profile = await readContract(config, {
//           abi: RISK_NFT_ABI,
//           address: RISK_NFT_ADDRESS,
//           functionName: "getRiskProfile",
//           args: [address],
//         });
//         setRiskProfile(profile);
//       }

//       // 3. Vault Balances
//       const [lowBal, medBal, highBal] = await Promise.all([
//         readContract(config, { abi: VAULT_ABI, address: LOW_RISK_VAULT, functionName: "balanceOf", args: [address] }),
//         readContract(config, { abi: VAULT_ABI, address: MEDIUM_RISK_VAULT, functionName: "balanceOf", args: [address] }),
//         readContract(config, { abi: VAULT_ABI, address: HIGH_RISK_VAULT, functionName: "balanceOf", args: [address] }),
//       ]);
//       setVaultBalances({
//         low: formatUnits(lowBal as bigint, 18),
//         med: formatUnits(medBal as bigint, 18),
//         high: formatUnits(highBal as bigint, 18),
//       });

//       // 4. Strategy Assets (Simulated or Real)
//       const strategyResults: Record<string, string> = {};
//       for (const strat of STRATEGIES) {
//         try {
//           // Assuming strategies have balanceOf or totalAssets. using balanceOf for now as it's common
//           const assets = await readContract(config, {
//             abi: STRATEGY_ABI,
//             address: strat.address as `0x${string}`,
//             functionName: "totalAssets", // Check if this exists in your strategy ABI
//             args: [],
//           });
//           strategyResults[strat.name] = formatUnits(assets as bigint, 18);
//         } catch (e) {
//           console.warn(`Could not fetch assets for ${strat.name}`, e);
//           strategyResults[strat.name] = "Error";
//         }
//       }
//       setStrategyData(strategyResults);

//     } catch (err) {
//       console.error("Error fetching data", err);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//     const interval = setInterval(fetchData, 10000); // Refresh every 10s
//     return () => clearInterval(interval);
//   }, [address, isConnected, result]);

//   // Actions
//   const handleAirdrop = async () => {
//     if (!address) return setResult("Connect wallet");
//     setLoading("Airdropping...");
//     try {
//       const hash = await writeContract(config, {
//         abi: USDT_ABI,
//         address: VIRTUAL_USDT_ADDRESS,
//         functionName: "airdrop",
//         account: address,
//         ...GAS_SETTINGS
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult("Airdrop successful!");
//       fetchData();
//     } catch (err: any) {
//       setResult(err?.shortMessage || "Airdrop failed");
//     }
//     setLoading(null);
//   };

//   const handleMintNFT = async () => {
//     if (!address) return setResult("Connect wallet");
//     setLoading("Minting NFT...");
//     try {
//       const hash = await writeContract(config, {
//         abi: RISK_NFT_ABI,
//         address: RISK_NFT_ADDRESS,
//         functionName: "mint",
//         args: [30, 50, 20], // Hardcoded profile for test
//         account: address,
//         gas: 5_000_000n,
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult("Risk NFT minted!");
//       fetchData();
//     } catch (err: any) {
//       setResult(err?.shortMessage || "Mint failed");
//     }
//     setLoading(null);
//   };

//   const handleDeposit = async () => {
//     if (!address) return setResult("Connect wallet");
//     setLoading("Depositing...");
//     try {
//       const amountVal = parseUnits(depositAmount, 18);

//       // Check Allowance
//       const allowance = await readContract(config, {
//         abi: USDT_ABI,
//         address: VIRTUAL_USDT_ADDRESS,
//         functionName: "allowance",
//         args: [address, VAULT_ROUTER_ADDRESS],
//       });

//       if ((allowance as bigint) < amountVal) {
//         setResult("Approving...");
//         const approveHash = await writeContract(config, {
//           abi: USDT_ABI,
//           address: VIRTUAL_USDT_ADDRESS,
//           functionName: "approve",
//           args: [VAULT_ROUTER_ADDRESS, amountVal],
//           account: address,
//           gas: 5_000_000n,
//         });
//         await waitForTransactionReceipt(config, { hash: approveHash });
//       }

//       setResult("Sending Deposit...");
//       const hash = await writeContract(config, {
//         abi: VAULT_ROUTER_ABI,
//         address: VAULT_ROUTER_ADDRESS,
//         functionName: "deposit",
//         args: [amountVal],
//         account: address,
//         gas: 5_000_000n,
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult("Deposit successful!");
//       fetchData();
//     } catch (err: any) {
//       console.error(err);
//       setResult(err?.shortMessage || "Deposit failed");
//     }
//     setLoading(null);
//   };

//   const handleWithdraw = async () => {
//     if (!address) return setResult("Connect wallet");
//     setLoading("Withdrawing...");
//     try {
//       const hash = await writeContract(config, {
//         abi: VAULT_ROUTER_ABI,
//         address: VAULT_ROUTER_ADDRESS,
//         functionName: "withdrawAll",
//         account: address,
//         gas: 5_000_000n
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult("Withdraw successful!");
//       fetchData();
//     } catch (err: any) {
//       setResult(err?.shortMessage || "Withdraw failed");
//     }
//     setLoading(null);
//   };

//   // Partial Withdraw
//   const [withdrawPct, setWithdrawPct] = useState<string>("100");
//   const handleWithdrawPartial = async () => {
//     if (!address) return setResult("Connect wallet");
//     setLoading("Withdrawing...");
//     try {
//       const bps = BigInt(Math.floor(parseFloat(withdrawPct) * 100)); // 100% -> 10000
//       const hash = await writeContract(config, {
//         abi: VAULT_ROUTER_ABI,
//         address: VAULT_ROUTER_ADDRESS,
//         functionName: "withdrawPartial",
//         args: [bps],
//         account: address,
//         gas: 5_000_000n
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult(`Withdraw ${withdrawPct}% successful!`);
//       fetchData();
//     } catch (err: any) {
//       setResult(err?.shortMessage || "Withdraw failed");
//     }
//     setLoading(null);
//   };

//   // Harvest
//   const handleHarvest = async (vaultAddress: `0x${string}`, name: string) => {
//     if (!address) return setResult("Connect wallet");
//     setLoading(`Harvesting ${name}...`);
//     try {
//       const hash = await writeContract(config, {
//         abi: VAULT_ABI,
//         address: vaultAddress,
//         functionName: "harvestAll",
//         args: [],
//         account: address,
//         gas: 5_000_000n,
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult(`Harvest ${name} successful!`);
//     } catch (err: any) {
//       setResult(err?.shortMessage || "Harvest failed");
//     }
//     setLoading(null);
//   };

//   // ADMIN function - Rebalance User Portfolio (Router)
//   const handleRouterRebalance = async () => {
//     if (!address) return setResult("Connect wallet");
//     setLoading("Rebalancing Portfolio...");
//     try {
//       const hash = await writeContract(config, {
//         abi: VAULT_ROUTER_ABI,
//         address: VAULT_ROUTER_ADDRESS,
//         functionName: "rebalance",
//         account: address,
//         gas: 5_000_000n,
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult("Portfolio Rebalance successful!");
//       fetchData();
//     } catch (err: any) {
//       setResult(err?.shortMessage || "Rebalance failed");
//     }
//     setLoading(null);
//   }

//   // ADMIN function - Rebalance Vault Strategies (Vault)
//   const handleVaultRebalance = async (vaultAddress: `0x${string}`, name: string) => {
//     if (!address) return setResult("Connect wallet");
//     setLoading(`Rebalancing ${name}...`);
//     try {
//       const hash = await writeContract(config, {
//         abi: VAULT_ABI, // Using Vault ABI, not Router
//         address: vaultAddress,
//         functionName: "rebalance",
//         account: address,
//         gas: 5_000_000n,
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult(`${name} Rebalance successful!`);
//     } catch (err: any) {
//       console.error(err);
//       setResult(err?.shortMessage || "Vault Rebalance failed");
//     }
//     setLoading(null);
//   }

//   // ADMIN - Update Allocations
//   const [allocTier, setAllocTier] = useState<string>("0"); // 0=Low, 1=Med, 2=High
//   const [targetAllocations, setTargetAllocations] = useState<Record<string, string>>({}); // strategyIndex -> percent

//   // Group strategies by tier for display
//   const TIER_STRATEGIES = {
//     0: [ // Low Risk
//       { name: "Stables Strategy", index: 0 },
//       { name: "Aave Bluechip Strategy", index: 1 },
//       { name: "Bluechip Yield Strategy", index: 2 },
//     ],
//     1: [ // Medium Risk
//       { name: "Lido Strategy", index: 0 },
//       { name: "rETH Strategy", index: 1 },
//       { name: "Curve Strategy", index: 2 },
//     ],
//     2: [ // High Risk
//       { name: "Meme Pools Strategy", index: 0 },
//       { name: "Emerging Opps Strategy", index: 1 },
//       { name: "Leveraged Yield Strategy", index: 2 },
//     ]
//   };

//   const currentTierStrats = TIER_STRATEGIES[parseInt(allocTier) as keyof typeof TIER_STRATEGIES] || [];

//   // Helper to get total allocated %
//   const totalAllocPct = currentTierStrats.reduce((sum, s) => sum + (parseInt(targetAllocations[s.index] || "0")), 0);

//   const handleUpdateAllocations = async () => {
//     if (!address) return setResult("Connect wallet");
//     if (totalAllocPct !== 100) return setResult(`Total allocation must be 100% (Present: ${totalAllocPct}%)`);
//     setLoading("Updating Allocations...");
//     try {
//       const tier = parseInt(allocTier);

//       const indices: bigint[] = [];
//       const allocBps: number[] = [];

//       currentTierStrats.forEach((s) => {
//         const valPct = parseInt(targetAllocations[s.index] || "0");
//         if (valPct > 0) {
//           indices.push(BigInt(s.index));
//           allocBps.push(valPct * 100); // Convert % to BPS (1% = 100 BPS)
//         }
//       });

//       let vaultAddr = LOW_RISK_VAULT;
//       if (tier === 1) vaultAddr = MEDIUM_RISK_VAULT;
//       if (tier === 2) vaultAddr = HIGH_RISK_VAULT;

//       const hash = await writeContract(config, {
//         abi: VAULT_ABI,
//         address: vaultAddr,
//         functionName: "updateAllocations", // Correct function name
//         args: [indices, allocBps],         // Correct args: indices, allocations(bps)
//         account: address,
//         gas: 5_000_000n,
//       });
//       await waitForTransactionReceipt(config, { hash });
//       setResult("Allocations Updated!");
//       setTargetAllocations({}); // Reset inputs after success
//     } catch (err: any) {
//       console.error(err);
//       setResult(err?.shortMessage || "Update failed");
//     }
//     setLoading(null);
//   };

//   return (
//     <DefaultLayout>
//       <div className="container mx-auto p-6 max-w-4xl dark:text-white">
//         <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">⚠️ Aura Protocol Testnet Dashboard</h1>

//         {/* Connection Status */}
//         <div className="mb-6 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg border border-transparent dark:border-slate-700">
//           <p className="text-gray-800 dark:text-gray-200"><strong>Address:</strong> {address || "Not Connected"}</p>
//           <p className="text-gray-800 dark:text-gray-200"><strong>vUSDT Balance:</strong> {usdtBalance} vUSDT</p>
//           <p className="text-gray-800 dark:text-gray-200"><strong>Risk Profile:</strong> {hasNFT ? "Minted ✅" : "Not Minted ❌"}</p>
//           {hasNFT && riskProfile && (
//             <div className="ml-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
//               Low: {riskProfile.lowPct?.toString() || riskProfile[0]?.toString()}%,
//               Med: {riskProfile.medPct?.toString() || riskProfile[1]?.toString()}%,
//               High: {riskProfile.highPct?.toString() || riskProfile[2]?.toString()}%
//             </div>
//           )}
//         </div>

//         {/* Vault Shares */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
//           <div className="p-4 border rounded bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
//             <h3 className="font-bold text-blue-800 dark:text-blue-300">Low Risk Vault</h3>
//             <p className="text-2xl text-gray-900 dark:text-white">{vaultBalances.low} <span className="text-sm">shares</span></p>
//             <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{LOW_RISK_VAULT}</p>
//           </div>
//           <div className="p-4 border rounded bg-yellow-50 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800">
//             <h3 className="font-bold text-yellow-800 dark:text-yellow-300">Medium Risk Vault</h3>
//             <p className="text-2xl text-gray-900 dark:text-white">{vaultBalances.med} <span className="text-sm">shares</span></p>
//             <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{MEDIUM_RISK_VAULT}</p>
//           </div>
//           <div className="p-4 border rounded bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800">
//             <h3 className="font-bold text-red-800 dark:text-red-300">High Risk Vault</h3>
//             <p className="text-2xl text-gray-900 dark:text-white">{vaultBalances.high} <span className="text-sm">shares</span></p>
//             <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{HIGH_RISK_VAULT}</p>
//           </div>
//         </div>

//         {/* Strategy Stats */}
//         <div className="mb-8 border rounded-lg p-6 bg-white dark:bg-slate-900 dark:border-slate-700">
//           <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Strategy Funds (TVL)</h2>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             {STRATEGIES.map((strat) => (
//               <div key={strat.address} className="p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-slate-700">
//                 <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">{strat.name}</p>
//                 <p className="text-lg text-green-600 dark:text-green-400">{strategyData[strat.name] || "Loading..."}</p>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* User Actions */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           <div className="border p-6 rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700">
//             <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">User Actions</h2>

//             <div className="flex gap-2 mb-4">
//               <button onClick={handleAirdrop} disabled={!!loading} className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 rounded font-medium disabled:opacity-50 transition-colors">
//                 {loading === "Airdropping..." ? "..." : "💰 Airdrop vUSDT"}
//               </button>
//               {!hasNFT && (
//                 <button onClick={handleMintNFT} disabled={!!loading} className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 rounded font-medium disabled:opacity-50 transition-colors">
//                   {loading === "Minting NFT..." ? "..." : "🆔 Mint Profile"}
//                 </button>
//               )}
//             </div>

//             <div className="flex gap-2 items-center mb-4">
//               <input
//                 type="number"
//                 value={depositAmount}
//                 onChange={(e) => setDepositAmount(e.target.value)}
//                 className="border p-2 rounded w-full bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white"
//                 placeholder="Amount"
//               />
//               <button onClick={handleDeposit} disabled={!!loading} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 min-w-[120px] transition-colors">
//                 {loading === "Depositing..." ? "..." : "Deposit"}
//               </button>
//             </div>

//             <div className="flex gap-2 items-center mb-4">
//               <input
//                 type="number"
//                 value={withdrawPct}
//                 onChange={(e) => setWithdrawPct(e.target.value)}
//                 className="border p-2 rounded w-full bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white"
//                 placeholder="% to Withdraw"
//                 max="100"
//                 min="0"
//               />
//               <button onClick={handleWithdrawPartial} disabled={!!loading} className="px-4 py-2 border border-blue-600 text-blue-600 rounded font-bold hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-50 min-w-[120px] transition-colors">
//                 Withdraw %
//               </button>
//             </div>

//             <button onClick={handleWithdraw} disabled={!!loading} className="w-full py-2 border border-gray-300 rounded hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors">
//               {loading === "Withdrawing..." ? "..." : "Withdraw All Assets"}
//             </button>

//             <div className="mt-4 p-2 bg-gray-50 dark:bg-slate-800 min-h-[40px] rounded text-sm text-center">
//               {result && <span className={result.includes("failed") ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}>{result}</span>}
//             </div>
//           </div>

//           {/* Admin / System Actions */}
//           <div className="border p-6 rounded-lg border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-900/10">
//             <h2 className="text-xl font-bold mb-4 text-red-800 dark:text-red-400">Admin / Testing</h2>
//             <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Test system functions. Ensure you are permitted.</p>

//             <button onClick={handleRouterRebalance} disabled={!!loading} className="w-full mb-3 px-4 py-3 bg-white border border-red-200 text-red-700 rounded hover:bg-red-50 font-medium text-left flex justify-between items-center dark:bg-slate-800 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/20 transition-colors">
//               <span>Rebalance User Portfolio (Router)</span>
//               <span>🔄</span>
//             </button>

//             <h3 className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-300">Rebalance Vaults (Strategies)</h3>
//             <div className="flex gap-2 mb-4">
//               <button onClick={() => handleVaultRebalance(LOW_RISK_VAULT, "Low Vault")} disabled={!!loading} className="flex-1 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Reb. Low</button>
//               <button onClick={() => handleVaultRebalance(MEDIUM_RISK_VAULT, "Med Vault")} disabled={!!loading} className="flex-1 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">Reb. Med</button>
//               <button onClick={() => handleVaultRebalance(HIGH_RISK_VAULT, "High Vault")} disabled={!!loading} className="flex-1 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300">Reb. High</button>
//             </div>

//             <h3 className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-300">Harvest Vaults</h3>
//             <div className="flex gap-2 mb-4">
//               <button onClick={() => handleHarvest(LOW_RISK_VAULT, "Low Risk")} disabled={!!loading} className="flex-1 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Harv. Low</button>
//               <button onClick={() => handleHarvest(MEDIUM_RISK_VAULT, "Med Risk")} disabled={!!loading} className="flex-1 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">Harv. Med</button>
//               <button onClick={() => handleHarvest(HIGH_RISK_VAULT, "High Risk")} disabled={!!loading} className="flex-1 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300">Harv. High</button>
//             </div>

//             <h3 className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-300">Update Allocations (Admin)</h3>
//             <div className="space-y-4 mb-4">
//               <select value={allocTier} onChange={(e) => setAllocTier(e.target.value)} className="w-full p-2 border rounded text-sm bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300">
//                 <option value="0">Low Risk Tier</option>
//                 <option value="1">Medium Risk Tier</option>
//                 <option value="2">High Risk Tier</option>
//               </select>

//               <div className="max-h-60 overflow-y-auto border rounded p-2 dark:border-slate-700">
//                 {currentTierStrats.map((strat) => (
//                   <div key={strat.index} className="flex justify-between items-center mb-2 last:mb-0">
//                     <span className="text-xs text-gray-600 dark:text-gray-400 truncate w-1/2" title={strat.name}>{strat.name}</span>
//                     <div className="flex items-center gap-1 w-1/2">
//                       <input
//                         type="number"
//                         min="0"
//                         max="100"
//                         placeholder="0"
//                         value={targetAllocations[strat.index] || ""}
//                         onChange={(e) => setTargetAllocations({ ...targetAllocations, [strat.index]: e.target.value })}
//                         className="w-full p-1 text-right border rounded text-xs bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white"
//                       />
//                       <span className="text-xs text-gray-500">%</span>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               <div className="flex justify-between text-sm font-bold">
//                 <span className="text-gray-700 dark:text-gray-300">Total:</span>
//                 <span className={totalAllocPct === 100 ? "text-green-600" : "text-red-500"}>{totalAllocPct}%</span>
//               </div>

//               <button onClick={handleUpdateAllocations} disabled={!!loading || totalAllocPct !== 100} className="w-full py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-700 dark:hover:bg-red-600 transition-colors">
//                 Update Allocations (Must be 100%)
//               </button>
//             </div>

//             <div className="p-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 text-xs rounded">
//               <strong>Note:</strong> Admin functions like `setYieldPeriod` or `addMinter` require the deployer account.
//             </div>
//           </div>
//         </div>

//       </div>
//     </DefaultLayout>
//   );
// };

// export default Test;
