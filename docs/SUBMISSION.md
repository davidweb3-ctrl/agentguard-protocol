# AgentGuard Protocol Submission

## Project Name

AgentGuard Protocol

## Tagline

Programmable spending limits for autonomous agents on Solana.

## One-Liner

AgentGuard gives autonomous agents budgets, not private keys, by enforcing owner-defined payment policies on-chain before any SPL token transfer can happen.

## Problem

AI agents are starting to pay for APIs, data, infrastructure, and on-chain services. The unsafe default is to give an agent a wallet key with broad spending authority.

That creates a simple but serious risk:

- A buggy agent can overspend.
- A compromised agent can drain funds.
- A paid API cannot easily know whether a payment was made inside the owner's rules.
- Human operators need a fast override path when an agent behaves unexpectedly.

## Solution

AgentGuard Protocol is a Solana-native spending firewall for autonomous agents.

Owners create a policy vault, deposit a test SPL token, allowlist merchants, set spending limits, and assign an agent authority. The agent can submit payments, but the Solana program checks policy before transferring funds.

The MVP demonstrates an x402-style paid API flow:

1. The agent requests a paid API resource.
2. The API returns an HTTP 402-style challenge.
3. The agent pays through `agent_pay`.
4. The AgentGuard program checks policy before transfer.
5. The program creates a `PaymentReceipt` PDA.
6. The agent retries with a receipt proof.
7. The API verifies the receipt account and returns paid data.

## Why Solana

Solana is a strong fit for agentic payments because it provides:

- Low fees for per-request payments.
- Fast confirmation for API-like flows.
- SPL token transfers for USDC-style settlement.
- PDAs for policy vaults, vault authorities, merchant policies, and receipts.
- Actions and Blinks for human override UX.

## What Is Implemented

- Anchor program with:
  - `initialize_agent`
  - `deposit`
  - `add_merchant`
  - `set_policy`
  - `set_pause`
  - `agent_pay`
- On-chain policy checks:
  - agent authority
  - merchant allowlist
  - per-transaction limit
  - daily limit
  - merchant cap
  - paused status
  - mint and vault constraints
- SPL token vault controlled by a PDA.
- `PaymentReceipt` PDA for every successful payment request.
- TypeScript SDK for PDA derivation and instruction builders.
- Express x402-style demo API.
- Agent client that handles 402 challenge, payment, and retry.
- Next.js dashboard view.
- Solana Action-style pause endpoint.
- Demo runbook and 3-minute demo script.

## Security Notes

- The agent authority can only call `agent_pay`.
- Policy checks happen before token transfer CPI.
- Rejection tests verify funds do not move.
- Duplicate request hashes are rejected by the receipt PDA seed.
- The demo API verifies the on-chain receipt owner and receipt contents before returning paid data.
- Local demo keypairs and `.env.demo` are ignored by git.

## Demo Commands

Build:

```bash
pnpm install
anchor build
```

Start local validator with the program loaded:

```bash
solana-test-validator --reset \
  --bpf-program 3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838 \
  target/deploy/agentguard_protocol.so
```

Seed local demo state:

```bash
pnpm --filter @agentguard/x402-demo-api seed
set -a && source .env.demo && set +a
```

Start the paid API:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api dev
```

Run the agent payment flow:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api agent
```

Check the pause Action:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/web dev
```

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api check:pause-action
```

## Verification

The current MVP passes:

```bash
pnpm lint
pnpm -r typecheck
pnpm --filter @agentguard/web build
pnpm test:ts
```

Latest test status:

- Anchor and SDK tests: 16 passing.
- Full local rehearsal: passed.
- x402 challenge to payment to paid data: passed.
- Pause Action transaction generation: passed.

## Demo Script

Use [docs/DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the primary 3-minute hackathon demo video, with a shorter backup cut if needed.

## Rehearsal Runbook

Use [docs/DEMO_RUNBOOK.md](DEMO_RUNBOOK.md) to reproduce the local demo from a clean localnet.

## Non-Goals For The MVP

- Real mainnet custody.
- Full x402 facilitator implementation.
- Natural-language policy parsing.
- Cross-chain execution.
- DeFi strategy automation.
- Enterprise compliance workflows.

## Post-MVP Roadmap

- Devnet deployment with wallet-signed owner operations.
- Real USDC support.
- Facilitator-compatible x402 settlement.
- Dashboard-backed policy creation, deposits, merchant management, pause, and receipt views.
- More receipt metadata and replay-resistant request semantics.
- Multisig or team-owned policy administration.
- Analytics for agent spend, merchant activity, and denied payments.

## Business Model

See [docs/BUSINESS_MODEL.md](BUSINESS_MODEL.md) for target customers, packaging, revenue model, go-to-market, risks, and 30/60/90 day roadmap.

## Suggested Submission Description

AgentGuard Protocol is a Solana-native spending firewall for autonomous agents. Instead of giving an agent unrestricted wallet access, an owner funds a policy vault and defines on-chain spending rules: allowed merchants, per-transaction limits, daily limits, merchant caps, and pause status.

The MVP demonstrates an x402-style paid API flow. The agent receives a 402 challenge, pays through the AgentGuard program, the program checks policy before transferring SPL tokens, and the API unlocks paid data only after verifying the on-chain `PaymentReceipt` PDA.

The project includes an Anchor program, TypeScript SDK, x402 demo API, agent client, dashboard view, Solana Action-style pause endpoint, tests, and a reproducible local demo runbook.
