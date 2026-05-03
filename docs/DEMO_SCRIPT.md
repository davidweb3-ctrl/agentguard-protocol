# Demo Script

Use this script for the primary 3-minute hackathon demo video. A shorter 60-90 second backup cut is included at the end.

## Primary 3-Minute Demo

### 0:00-0:25: Problem

Show the README title or dashboard.

Say:

> AI agents are starting to pay for APIs, data, and on-chain services. The dangerous version is giving an agent a private key with broad spending power. If the agent is buggy or compromised, it can overspend or drain funds.

### 0:25-0:50: Solution

Show the dashboard policy cards.

Say:

> AgentGuard Protocol gives agents budgets, not private keys. The owner funds a Solana policy vault, allowlists merchants, sets per-transaction and daily limits, and can pause the agent at any time.

### 0:50-1:10: Demo Setup

Show the seeded dashboard or terminal with `.env.demo` loaded.

Say:

> For this demo, the owner has created an agent profile, deposited a test SPL token that represents USDC, and allowlisted one paid API merchant.

Optional terminal:

```bash
set -a && source .env.demo && set +a
```

### 1:10-1:55: x402-Style Payment Flow

Run:

```bash
pnpm --filter @agentguard/x402-demo-api agent
```

Point out:

- `error: "payment_required"`
- `protocol: "agentguard-x402-demo"`
- `amount`
- `merchant`
- `requestHash`
- `receiptPda`
- `txSignature`
- `paidStatus: 200`

Say:

> The agent first requests a paid resource and receives a 402-style challenge. It then calls `agent_pay`. The Solana program checks the agent authority, merchant allowlist, per-transaction limit, daily limit, merchant cap, and paused status before it transfers tokens.

### 1:55-2:20: Receipt Verification

Keep the agent output on screen and highlight `receiptPda` and `paidStatus: 200`.

Say:

> After the transfer, the program creates a `PaymentReceipt` PDA. The API does not unlock because the agent claims it paid. It verifies the on-chain receipt account and checks the receipt contents against the challenge before returning paid data.

### 2:20-2:40: Human Override

Run:

```bash
pnpm --filter @agentguard/x402-demo-api check:pause-action
```

Point out:

- `Pause AgentGuard Agent`
- transaction `byteLength`

Say:

> AgentGuard also exposes a Solana Action-style pause endpoint. This gives the owner a human override path when an autonomous agent needs to be stopped quickly.

### 2:40-3:00: Closing

Show the dashboard or README tagline.

Say:

> AgentGuard is not an AI wallet and not a trading bot. It is a Solana-native spending firewall for autonomous agents. The core idea is simple: give agents budgets, not private keys.

## Recording Checklist

Before recording:

```bash
pnpm lint
pnpm -r typecheck
pnpm --filter @agentguard/web build
pnpm test:ts
```

Prepare the demo:

```bash
anchor build
solana-test-validator --reset \
  --bpf-program 3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838 \
  target/deploy/agentguard_protocol.so
```

In another terminal:

```bash
pnpm --filter @agentguard/x402-demo-api seed
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api dev
```

In another terminal:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/web dev
```

## Backup 60-90 Second Cut

Use this only if a shorter clip is needed.

1. Problem: agents need to pay, but private keys are too dangerous.
2. Solution: AgentGuard gives agents owner-defined Solana budgets.
3. Demo: run the agent command and show 402 challenge, `agent_pay`, `receiptPda`, and `paidStatus: 200`.
4. Safety: policy checks happen before token transfer.
5. Override: run pause action checker.
6. Closing: give agents budgets, not private keys.

## Backup Plan

If live localnet is unstable, show these already rehearsed outputs:

- `paidStatus: 200`
- `receiptPda`
- `txSignature`
- pause action transaction `byteLength: 212`

Then explain the full flow from [docs/DEMO_RUNBOOK.md](DEMO_RUNBOOK.md).
