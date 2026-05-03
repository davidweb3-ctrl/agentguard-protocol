# AgentGuard Protocol

Programmable spending limits for autonomous agents on Solana.

AgentGuard is a Solana-native control layer for AI agents that need to pay for APIs, data, and on-chain services without receiving unrestricted wallet access. Owners fund a policy vault, define merchant allowlists and spend limits, and let an agent execute payments only inside those rules.

## MVP

The hackathon MVP is intentionally narrow:

- Anchor policy vault for one SPL token mint.
- Owner-controlled deposit, pause, and policy update.
- Agent-controlled payment path with per-transaction and daily limits.
- Merchant allowlist with per-merchant cap.
- Receipt PDA for every successful payment request.
- x402-style demo API that returns an HTTP 402 challenge and accepts a paid retry.
- Blink or Action for human pause or approval.

## Why Solana

Agent payments need low fees, fast confirmation, cheap receipts, and composable payment surfaces. Solana provides:

- SPL token transfers for USDC-style payments.
- PDAs for policy vaults and immutable receipt addressing.
- Actions and Blinks for human override UX.
- Fast settlement that makes per-request machine payments practical.
- Existing x402 and agentic payment momentum.

## Repository Layout

```text
apps/web/                 Next.js dashboard placeholder
docs/                     Product, architecture, and MVP docs
packages/sdk/             TypeScript helpers for deriving accounts and building flows
programs/agentguard-protocol/
                           Anchor program
services/x402-demo-api/   Demo paid API service
tests/                    Anchor TypeScript tests
```

## Core Flow

```text
Owner creates AgentProfile and vault
Owner deposits devnet USDC or test SPL token
Owner adds merchant policy and limits
Agent calls paid API
API returns 402 payment challenge
Agent submits agent_pay transaction
Program enforces limits and transfers funds
Program writes receipt PDA
Agent retries API with tx signature or receipt proof
```

## Local Development

```bash
pnpm install
anchor build
anchor test
```

The generated program id is currently:

```text
3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838
```

## Demo Acceptance Tests

- Approved merchant payment transfers tokens and writes a receipt PDA.
- Unknown merchant payment fails before transfer.
- Over-limit payment fails before transfer.
- Paused agent payment fails before transfer.
- Blink or Action can pause the agent or approve a human override path.

## Non-Goals for the Hackathon MVP

- Custody for real mainnet funds.
- Cross-chain execution.
- Full x402 facilitator implementation.
- Complex DeFi strategy execution.
- Enterprise compliance workflow.

## License

Apache-2.0
