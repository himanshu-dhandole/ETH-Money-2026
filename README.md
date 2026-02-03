# 🌾 Aura Farmer

> **DeFi's first personality layer.** A single 2-minute conversational quiz generates a unique, lifetime investment strategy — deployed into self-adjusting ERC-4626 vaults, minted as a composable soulbound NFT, and verified on-chain via EIP-712 signed AI decisions.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)]()
[![Checkpoint](https://img.shields.io/badge/Hackathon-Checkpoint%201-orange)]()
[![Contracts](https://img.shields.io/badge/Solidity-ERC%204626%20%7C%20ERC%20721-green)]()

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [The Problem](#the-problem)
3. [The Solution — How Aura Farmer Works](#the-solution)
4. [User Journey — End to End](#user-journey)
5. [Core Features](#core-features)
   - [Personalized Risk Vaults](#personalized-risk-vaults)
   - [Soulbound Risk NFT](#soulbound-risk-nft)
   - [Volume Knob Risk Management](#volume-knob-risk-management)
   - [Adaptive Learning Engine](#adaptive-learning-engine)
   - [ZK Privacy Layer](#zk-privacy-layer)
   - [Emergency Exit Coordination](#emergency-exit-coordination)
   - [Verifiable On-Chain AI](#verifiable-on-chain-ai)
6. [Architecture](#architecture)
   - [System Overview](#system-overview)
   - [Smart Contract Layer](#smart-contract-layer)
   - [AI / Off-Chain Layer](#ai--off-chain-layer)
   - [Data Flow](#data-flow)
7. [Risk Profile Profiles — By the Numbers](#risk-profiles--by-the-numbers)
8. [Crash Scenario Walkthrough](#crash-scenario-walkthrough)
9. [Revenue Model](#revenue-model)
10. [Tech Stack](#tech-stack)
11. [Checkpoint Status](#checkpoint-status)
12. [Design Decisions & Why](#design-decisions--why)
13. [Roadmap](#roadmap)
14. [How to Run](#how-to-run)
15. [License](#license)

---

## Project Overview

Aura Farmer is an AI-powered DeFi yield protocol that personalizes investment strategy at the individual level. Every user gets a unique risk profile — not a bucket, not a tier, but a *spectrum position* — and the protocol continuously manages their funds to match that profile as market conditions shift.

The core insight: DeFi protocols today treat all users the same. One liquidation threshold. One rebalancing trigger. One strategy. That works for a hedge fund running a single mandate. It fails for the 99% of on-chain users who have wildly different risk tolerances, time horizons, and emotional responses to volatility.

Aura Farmer fixes this by turning risk management into a *personal* experience — and making that personality composable, verifiable, and useful across the entire DeFi ecosystem.

---

## The Problem

Current DeFi yield strategies force users into one of three bad options:

**Option A — Do it yourself.** Manually rebalance across protocols. Requires expertise, constant monitoring, and nerve. Most retail users burn out or get liquidated in their first crash.

**Option B — Use a fixed vault.** Deposit into an existing yield aggregator. Get the same allocation, same risk, same crash behavior as every other depositor. No personalization. No adaptation.

**Option C — Pick a risk tier.** Some protocols offer Low / Medium / High. Binary jumps. No in-between. And the "Low" tier still liquidates your position in a 30% drawdown if you're unlucky with timing.

None of these account for *who you are* — your age, your portfolio size, your time horizon, your emotional tolerance for drawdowns, or how you've actually behaved in past crashes.

---

## The Solution

Aura Farmer takes a 2-minute conversational quiz — not a form, a real back-and-forth — and uses it to generate a precise, continuous risk score for each user. That score drives:

- **Where** your funds are allocated (which protocols, which asset pairs)
- **How much** sits in high-yield vs. stable positions at any given time
- **How fast** the protocol rebalances when markets move
- **When** you get priority in an emergency exit
- **What** other protocols can learn about you (via your soulbound NFT)

The result: a 22-year-old with a high risk appetite and a long time horizon might be 80% in aggressive yield farms targeting 15% APY. A 45-year-old saving for a house might be 70% in blue-chip Aave / Lido positions targeting a safe 5%. Same protocol. Completely different strategies. Both automated. Both adaptive.

---

## User Journey — End to End

```
Step 1 — Quiz
   User opens Aura Farmer and answers a short conversational quiz.
   Questions adapt based on previous answers (not a static form).
   Covers: age, portfolio size, time horizon, risk comfort, past behavior.

Step 2 — AI Risk Profile Generation
   Off-chain AI model processes quiz responses.
   Outputs a continuous risk score (0.0 – 1.0) plus a strategy vector:
      → allocation percentages across protocol categories
      → rebalancing thresholds and speed
      → crash-response rules
      → emergency exit priority tier

Step 3 — Soulbound NFT Mint
   Risk profile is hashed and minted as a non-transferable ERC-721 NFT.
   The NFT is composable — other protocols can call it to read your verified profile.
   Examples: Aave reads it to offer custom loan terms.
            A DAO reads it to verify risk-aware eligibility.
            An insurance protocol reads it to price your premium.

Step 4 — Vault Deployment
   A personalized ERC-4626 vault is deployed (or assigned) for the user.
   Funds are routed to the correct protocols based on the strategy vector.
   User sees a dashboard: current allocation, live APY, risk score, next rebalance trigger.

Step 5 — Continuous Management
   The rebalancing engine monitors market conditions in real time.
   Adjusts allocations smoothly — no sudden binary flips.
   Risk is a volume knob. It turns gradually, not on/off.

Step 6 — Learning & Recalibration
   The protocol observes user behavior over time:
      → Did they panic-sell during a dip? Risk tolerance gets auto-lowered.
      → Did they add more during a crash? Risk tolerance gets nudged up.
   Profile updates are signed on-chain (EIP-712) for full auditability.
```

---

## Core Features

### Personalized Risk Vaults

Each user gets a dedicated **ERC-4626 vault** — the standard for yield-bearing token vaults on EVM chains. These vaults are not generic. They are parameterized by the user's risk profile at deployment:

- **Allocation weights** — How much goes to high-yield, medium-yield, and stable positions
- **Rebalancing bands** — How far an allocation can drift before the engine corrects it
- **Max drawdown tolerance** — The deepest drop the vault is configured to absorb before triggering a defensive shift

ERC-4626 was chosen for composability. Any protocol that understands the standard can interact with Aura vaults — deposit, withdraw, check share price — without custom integration.

### Soulbound Risk NFT

Each user's risk profile is minted as a **soulbound (non-transferable) ERC-721 NFT**. This is one of the key innovations in Aura Farmer.

**Why soulbound?** Risk profiles are personal. They shouldn't be tradeable or transferable. A 22-year-old's aggressive profile shouldn't be sellable to a 60-year-old to game loan terms.

**Why on-chain?** Because it makes the profile *composable*. Any DeFi protocol can call your NFT's metadata and act on it:

| Protocol Type | What It Reads | What It Does |
|---|---|---|
| Lending (e.g. Aave) | Risk score + history | Offers personalized collateral ratios or loan terms |
| DAO | Risk profile + behavior | Verifies eligibility for risk-aware governance roles |
| Insurance | Crash behavior + allocation | Prices your premium based on actual on-chain behavior |
| Yield Aggregator | Strategy vector | Routes your funds optimally without you re-entering a quiz |

The NFT is updated (not re-minted) as the profile evolves — keeping the same token ID, preserving history.

### Volume Knob Risk Management

Traditional DeFi uses **binary liquidation**: if your collateral drops below a threshold, your position is closed. One bad candle and you're out.

Aura Farmer replaces this with a **continuous rebalancing model** — risk is a volume knob, not a switch.

How it works in practice:
- When markets drop 5%, the engine might shift 10% of a conservative vault from yield to stablecoins.
- At a 10% drop, another 15% shifts.
- At 20%, a conservative vault is now 90% stablecoins — but never fully exited, never liquidated.
- An aggressive vault barely moves at 5% or 10%. It only begins adjusting at 25%+.

The thresholds and shift amounts are derived from the user's risk score. No two vaults respond to the same crash identically.

### Adaptive Learning Engine

Aura Farmer doesn't just set your risk profile once and forget it. It **learns from your behavior**.

The protocol watches on-chain signals over time:

| User Behavior | Signal | Adaptive Response |
|---|---|---|
| Panic-sold during last 20% crash | High emotional volatility | Risk tolerance lowered; more aggressive crash-response |
| Added capital during a 15% dip | High conviction under pressure | Risk tolerance nudged up; looser rebalancing bands |
| Withdrew everything during a 5% dip | Very low stress tolerance | Significant risk reduction; earlier defensive shifts |
| Held through a 30% crash untouched | Extremely high tolerance | Risk tolerance raised; wider bands allowed |

These adjustments are not silent. They are proposed by the AI, signed on-chain via EIP-712, and visible to the user before taking effect. The user can override if needed.

> 🔄 *Adaptive learning is in progress for Checkpoint 2.*

### ZK Privacy Layer

Not every user wants their risk profile to be publicly readable on-chain. Some users are fine with composability. Others don't want competitors, employers, or anyone else to see their exact allocation strategy.

Aura Farmer integrates **zero-knowledge proofs** to allow selective disclosure:

- A user can prove to Aave that their risk score is above a certain threshold — *without revealing the actual score*.
- A user can prove they have a valid, active Aura profile — *without revealing their wallet or allocation*.
- Insurance protocols can verify crash behavior — *without seeing the user's full history*.

This is built on top of the soulbound NFT layer. The NFT holds the ground truth; ZK proofs allow selective, verifiable access to it.

> 🔄 *ZK proof integration is in progress for Checkpoint 2.*

### Emergency Exit Coordination

When a protocol hack or black swan event hits, everyone tries to exit at once. Slippage destroys value. The people who get out first, survive. The rest get wrecked.

Aura Farmer solves this with a **priority-based emergency exit queue**:

1. **Conservative profiles exit first** — They have the least tolerance for loss, so they get priority.
2. **Medium profiles exit second** — Balanced between speed and orderly exit.
3. **Aggressive profiles exit last** — They have the highest drawdown tolerance and are most likely to ride it out or recover.

This isn't just fair — it's *rational*. An aggressive user's profile literally says they can absorb more loss. A conservative user's profile says they can't. The exit queue is a direct consequence of the risk profiles the users themselves declared.

> 🔄 *Emergency exit priority queue is in progress for Checkpoint 2.*

### Verifiable On-Chain AI

One of the biggest trust problems in DeFi automation: how do you know the AI isn't just doing whatever it wants with your money?

Every decision Aura Farmer's AI makes — every rebalance, every allocation shift, every risk update — is **signed on-chain using EIP-712 typed data signatures**.

This means:
- The exact decision is recorded (what moved, where, why).
- The AI's "reasoning" (inputs and outputs) is logged.
- Anyone can verify that the decision was authorized and matches the user's profile.
- No black box. Full auditability. On-chain, forever.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│          Quiz  ·  Dashboard  ·  Allocation View                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI / OFF-CHAIN LAYER                        │
│                                                                 │
│   ┌─────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│   │ Quiz Engine │──▶│ Risk Score Model │──▶│ Strategy Vector │  │
│   └─────────────┘   └──────────────────┘   └────────┬────────┘  │
│                                                     │            │
│   ┌─────────────────────────┐   ┌────────────────────┐          │
│   │ Adaptive Learning Loop  │◀──│ On-chain Behavior  │          │
│   │ (behavior → recalibrate)│   │ Indexer            │          │
│   └─────────────────────────┘   └────────────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │  (EIP-712 signed decisions)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SMART CONTRACT LAYER                        │
│                                                                 │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐  │
│   │ ERC-4626 Vaults│   │ Soulbound NFT  │   │ Rebalancing    │  │
│   │ (personalized) │   │ (ERC-721)      │   │ Engine         │  │
│   └───────┬────────┘   └───────┬────────┘   └───────┬────────┘  │
│           │                    │                    │            │
│           ▼                    ▼                    ▼            │
│   ┌────────────────────────────────────────────────────────┐    │
│   │              EIP-712 Decision Log (on-chain)           │    │
│   └────────────────────────────────────────────────────────┘    │
│                                                                 │
│   ┌─────────────────┐   ┌─────────────────────────────┐        │
│   │ ZK Proof Layer  │   │ Emergency Exit Priority Queue│        │
│   │ (in progress)   │   │ (in progress)               │        │
│   └─────────────────┘   └─────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL DeFi PROTOCOLS                        │
│         Aave  ·  Lido  ·  Yield Farms  ·  Stablecoins          │
└─────────────────────────────────────────────────────────────────┘
```

### AI / Off-Chain Layer

| Component | Role |
|---|---|
| **Quiz Engine** | Adaptive conversational interface. Questions branch based on prior answers. Outputs raw user signals. |
| **Risk Score Model** | Takes quiz output → produces a continuous risk score (0.0–1.0) and a full strategy vector. |
| **Strategy Vector** | Defines allocation %, rebalancing bands, crash-response curve, and exit priority for the user. |
| **Behavior Indexer** | Watches on-chain events (deposits, withdrawals, swaps) and feeds signals to the adaptive loop. |
| **Adaptive Learning Loop** | Recalibrates risk score based on observed behavior. Proposes updates → signed on-chain. |

### Data Flow

```
Quiz Input
    │
    ▼
Risk Score (0.0 – 1.0)  +  Strategy Vector
    │                              │
    ├──────────────────────────────┤
    ▼                              ▼
Soulbound NFT Mint          Vault Parameterization
    │                              │
    ▼                              ▼
Composable Profile          Funds Routed to Protocols
(readable by Aave, DAOs,        │
 Insurance, etc.)               ▼
                          Continuous Rebalancing
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
             EIP-712 Log               Behavior Indexed
                                            │
                                            ▼
                                     Adaptive Recalibration
                                     (loop back to profile update)
```

---

## Risk Profiles — By the Numbers

The table below shows example profiles that Aura Farmer might generate. These are not fixed tiers — every user gets a unique position on the spectrum. These are illustrative points.

| Profile | Age | Risk Score | High-Yield Allocation | Stable Allocation | Target APY | Rebalance Speed | Crash Response (at -20%) |
|---|---|---|---|---|---|---|---|
| Degen | 22 | 0.85 | 80% | 5% | ~15% | Slow (wide bands) | Minimal shift (~5% to stable) |
| Balanced | 30 | 0.55 | 50% | 25% | ~9% | Medium | Moderate shift (~30% to stable) |
| Conservative | 45 | 0.25 | 20% | 55% | ~5% | Fast (tight bands) | Aggressive shift (~90% to stable) |
| Ultra-Safe | 58 | 0.10 | 5% | 80% | ~3% | Instant | Full shift to stablecoins |

> **Note:** Risk score is continuous, not categorical. A user with a score of 0.42 gets a proportionally blended strategy — not rounded to the nearest bucket.

---

## Crash Scenario Walkthrough

**Scenario: Market drops 20% over 6 hours.**

### What happens to the Degen (risk score 0.85):
- Rebalancing engine detects the drawdown.
- Strategy vector says: tolerate up to 30% before shifting.
- 20% is within tolerance → **no action taken**.
- Vault stays 80% in high-yield farms. Absorbs the dip. Positions for recovery.

### What happens to the Conservative (risk score 0.25):
- Rebalancing engine detects the drawdown.
- Strategy vector says: begin shifting at 10%.
- At 10% drop → 30% of high-yield moved to stablecoins.
- At 15% drop → another 25% moved.
- At 20% drop → vault is now **90% stablecoins**. Capital preserved.
- No liquidation event. No single "death blow." Gradual, continuous de-risking.

### What happens to the Balanced (risk score 0.55):
- Starts shifting at 12%.
- At 20% → vault is roughly 60% stablecoins, 40% still in yield positions.
- Strikes a middle ground: some capital preserved, some still positioned for a bounce.

### Key point:
All three users were in the **same protocol**. Same market crash. Completely different outcomes — because their vaults were configured to match their actual risk tolerance from day one.

---

## Revenue Model

Aura Farmer generates revenue through **vault performance fees**:

- A percentage fee is taken on *gains* generated by each vault — not on deposits or withdrawals.
- Fee rate is tiered by vault performance: higher returns → slightly higher fee percentage.
- Fees are taken in the vault's native asset and can be directed to a protocol treasury or distributed to governance token holders.

This aligns incentives: Aura Farmer only earns when users earn. A vault that underperforms pays nothing.

> 🔄 *Full performance fee revenue flow is in progress for Checkpoint 2.*

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Smart Contracts | Solidity | ERC-4626 vaults, ERC-721 soulbound NFTs, rebalancing engine |
| On-chain Verification | EIP-712 Typed Data | Signing and logging every AI decision on-chain |
| AI / ML | Risk scoring model, adaptive learning | Generating and updating user risk profiles |
| ZK Proofs | *(Integration in progress)* | Privacy-preserving selective disclosure of profile data |
| Behavior Indexing | On-chain event indexer | Tracking user actions for adaptive learning |
| Frontend | Conversational quiz interface, allocation dashboard | User-facing experience |

---

## Checkpoint Status

This is **Checkpoint 1** of the hackathon. The table below shows what is live and what is actively in progress for Checkpoint 2.

| Feature | Status | Notes |
|---|---|---|
| Conversational quiz & risk profile generation | ✅ Live | Adaptive branching quiz, outputs risk score + strategy vector |
| ERC-4626 vault contracts | ✅ Live | Parameterized per-user vaults, standard-compliant |
| Soulbound risk NFT minting | ✅ Live | ERC-721, non-transferable, composable metadata |
| Basic rebalancing logic | ✅ Live | Threshold-based rebalancing driven by strategy vector |
| EIP-712 on-chain decision signing | ✅ Live | Every rebalance and update is signed and logged |
| ZK proof integration | 🔄 In Progress | Selective disclosure layer on top of soulbound NFT |
| Adaptive learning (behavior tracking & recalibration) | 🔄 In Progress | On-chain behavior indexing + risk score updates |
| Emergency exit priority queue | 🔄 In Progress | Conservative-first exit ordering |
| Cross-protocol composability hooks | 🔄 In Progress | Aave custom terms, DAO eligibility, insurance pricing |
| Full performance fee revenue flow | 🔄 In Progress | Fee calculation, collection, and distribution |

---

## Design Decisions & Why

### Why ERC-4626 for vaults?
ERC-4626 is the emerging standard for yield-bearing vaults on EVM. It means any other protocol can interact with Aura vaults without custom code. Composability out of the box.

### Why soulbound NFTs instead of just on-chain data?
A soulbound NFT is a *token*. Other protocols already know how to check token ownership and read token metadata. Putting the risk profile in an NFT makes it plug-and-play for the entire ecosystem — no new interfaces needed.

### Why a quiz instead of a wallet analysis?
Wallet analysis can estimate behavior, but it can't capture *intent*. A user might have held through a crash because they forgot about their position — not because they're risk-tolerant. The quiz captures what the user *wants*, not just what they've done. Adaptive learning then layers in what they actually *do* over time.

### Why EIP-712 for AI decisions?
Off-chain AI is powerful but unverifiable by default. EIP-712 typed data signatures let us log every AI decision on-chain in a structured, human-readable, and cryptographically verifiable way. No black box. Users and auditors can trace every move.

### Why continuous rebalancing instead of liquidation thresholds?
Liquidation is brutal and binary. One bad candle at the wrong time wipes you out. Continuous rebalancing spreads the risk management across time — it's smoother, less gassable in aggregate, and preserves more capital in drawdowns. It's the difference between a volume knob and a power switch.

### Why conservative users exit first in emergencies?
Because their profile literally says they can't tolerate loss. An aggressive user's strategy is built to absorb drawdowns. A conservative user's isn't. Giving conservative users priority in an emergency exit is the logical extension of their own declared risk tolerance.

---

## Roadmap

### Checkpoint 1 (Current)
- Core quiz → risk profile → vault → NFT flow is live
- Basic rebalancing and EIP-712 decision logging working
- End-to-end demo ready

### Checkpoint 2 (Upcoming)
- ZK proof layer for privacy-preserving composability
- Adaptive learning loop: behavior indexing + automatic recalibration
- Emergency exit priority queue
- Full cross-protocol composability hooks (Aave, DAOs, insurance)
- Performance fee revenue flow

### Post-Hackathon (Vision)
- Multi-chain deployment
- Governance token for protocol decisions
- Third-party protocol SDK for integrating with Aura profiles
- Mobile-first experience
- Expanded adaptive learning signals (gas behavior, cross-protocol activity)


---

## License

MIT
