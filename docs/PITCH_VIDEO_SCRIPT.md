# Pitch Video Script

Use this for the primary 3-minute Colosseum submission video. The goal is to explain why AgentGuard should exist, who it is for, why now, and why it can become a real Solana startup.

This video should feel like a brief startup pitch, not a product demo.

## 0:00-0:15: Team Background

Show the README title or a simple title slide.

Say:

> I am a solo founder and former Alibaba engineer, with a background in distributed systems and production safety. I recently joined the Solana developer ecosystem through community training, and this is my first hackathon project. AgentGuard is built solo plus AI, and it applies my safety engineering experience to a new problem: autonomous agent spending.

## 0:15-0:40: Problem

Show a simple slide or dashboard hero.

Say:

> AI agents are starting to take actions on behalf of users and teams. The next step is payments: APIs, data, compute, infrastructure, and on-chain services. But the dangerous version is giving an agent a private key with broad spending power. If the agent is buggy or compromised, it can overspend or drain funds.

## 0:40-1:00: Why Now

Show the architecture diagram or README demo flow.

Say:

> This is becoming urgent because agent payments, x402-style paid APIs, Solana Actions, and agent frameworks are converging. Solana is fast and cheap enough for per-request payments, and PDAs make policy vaults and payment receipts composable.

## 1:00-1:25: Product

Show the dashboard policy cards.

Say:

> AgentGuard gives agents budgets, not private keys. The owner creates a policy vault, deposits a test SPL token, allowlists merchants, sets per-transaction and daily limits, and can pause the agent at any time. The agent can pay, but only through the AgentGuard program.

## 1:25-1:55: Short Demo Proof

Show the terminal running:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api agent
```

Point out:

- `payment_required`
- `agent_pay`
- `receiptPda`
- `paidStatus: 200`

Say:

> In the demo, the API returns a 402-style challenge. The agent submits `agent_pay`. The program checks policy before transfer, creates a `PaymentReceipt` PDA, and the API verifies that receipt before returning paid data.

## 1:55-2:20: Safety And UX

Show the policy checks or tests summary.

Say:

> The core safety property is that policy checks happen before funds move: agent authority, merchant allowlist, per-transaction limit, daily limit, merchant cap, paused status, mint, and vault constraints. The owner also has a Solana Action-style pause endpoint for human override.

## 2:20-2:40: Market

Show target customer bullets or the business model doc.

Say:

> The first users are Solana agent builders and paid API providers. The next users are DAO automation teams, trading and ops bots, and agent wallet or framework providers that need safer payment primitives.

## 2:40-2:55: Business Model

Show the business model doc.

Say:

> The open-source protocol builds trust and adoption. The business can grow around a hosted dashboard, per-agent pricing, payment volume fees for hosted integrations, premium monitoring, and enterprise policy hosting.

## 2:55-3:00: Closing

Show the tagline.

Say:

> AgentGuard Protocol is a Solana-native spending firewall for autonomous agents. Give agents budgets, not private keys.

## Common Mistakes To Avoid

- Do not turn this into a full technical walkthrough.
- Do not spend too long on buzzwords.
- Do not overclaim devnet USDC, full wallet creation UI, or production x402 facilitator support.
- Do not exceed 3 minutes.
