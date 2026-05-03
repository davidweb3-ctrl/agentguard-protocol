# Demo Script

Use this script for a 60-90 second recording or live walkthrough.

## One-Liner

AgentGuard Protocol gives autonomous agents programmable spending limits on Solana, so owners can fund agent workflows without handing agents unrestricted private keys.

## Opening

AI agents are starting to pay for APIs, data, and services. The dangerous version is giving an agent a private key with broad spending power.

AgentGuard takes the opposite approach: the owner funds a Solana policy vault and gives the agent a budget, not the private key.

## Live Demo Beats

### 1. Show The Policy Vault

Show the dashboard at:

```text
http://127.0.0.1:3000
```

Say:

> The owner defines a policy vault with a per-transaction limit, a daily limit, an allowlisted merchant, a merchant cap, and a pause switch.

### 2. Run The Paid API Flow

Run:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api agent
```

Point out:

- The first API response is a 402-style payment challenge.
- The challenge includes amount, merchant, token account, agent profile, program id, and request hash.
- The agent pays through `agent_pay`.
- The output includes `txSignature`, `receiptPda`, and `paidStatus: 200`.

Say:

> The agent can pay, but only through the AgentGuard program. The program checks the policy before it transfers tokens.

### 3. Show Receipt Verification

Point to the paid response:

```text
paid API response unlocked by AgentGuard receipt
```

Say:

> The API does not unlock because the agent claims it paid. It verifies the on-chain receipt PDA and checks the receipt contents against the challenge.

### 4. Show Human Override

Run:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api check:pause-action
```

Point out:

- `Pause AgentGuard Agent`
- non-zero transaction byte length

Say:

> The owner can trigger a Solana Action-style pause transaction. That is the human override path for autonomous spending.

## Closing

AgentGuard is not an AI wallet and not a trading bot. It is a Solana-native spending firewall for autonomous agents.

The core idea is simple:

> Give agents budgets, not private keys.

## Backup Plan

If live localnet is unstable, show these already rehearsed outputs:

- `paidStatus: 200`
- `receiptPda`
- `txSignature`
- pause action transaction `byteLength: 212`

Then explain the flow from [docs/DEMO_RUNBOOK.md](DEMO_RUNBOOK.md).
