# Technical Demo Script

Use this for the 2-3 minute technical demo video. The goal is to explain how the implementation works, how it uses Solana, and what was actually built.

This video should be direct, specific, and implementation-focused. Do not repeat the full pitch.

## 0:00-0:20: Repo And Architecture

Show the repository and README architecture flow.

Say:

> This repo contains the AgentGuard Anchor program, TypeScript SDK, x402-style demo API, agent client, Next.js dashboard, and Solana Action-style pause endpoint.

Point to:

```text
programs/agentguard-protocol/
packages/sdk/
services/x402-demo-api/
apps/web/
tests/
```

## 0:20-0:50: On-Chain Accounts

Show `programs/agentguard-protocol/src/lib.rs`.

Say:

> The core accounts are `AgentProfile`, `MerchantPolicy`, and `PaymentReceipt`. The vault is an SPL token account controlled by a PDA. The receipt PDA is derived from the agent profile and request hash, which prevents duplicate receipts for the same request.

Highlight:

- `AgentProfile`
- `MerchantPolicy`
- `PaymentReceipt`
- vault authority PDA

## 0:50-1:25: Local Setup And Seed

Show the local validator and seed output.

Commands:

```bash
solana-test-validator --reset \
  --bpf-program 3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838 \
  target/deploy/agentguard_protocol.so
```

```bash
pnpm --filter @agentguard/x402-demo-api seed
set -a && source .env.demo && set +a
```

Say:

> The seed script creates a local test mint, funds the owner, creates the agent profile and policy vault, deposits test tokens, and allowlists one merchant.

## 1:25-2:00: x402-Style Agent Payment

Run:

```bash
pnpm --filter @agentguard/x402-demo-api agent
```

Point out:

- 402 challenge fields
- `requestHash`
- `txSignature`
- `receiptPda`
- `paidStatus: 200`

Say:

> The agent client receives the challenge, builds an `agent_pay` instruction through the SDK, signs with the agent authority, and retries the API with a proof. The API verifies the on-chain receipt before returning paid data.

## 2:00-2:25: Policy Enforcement

Run the over-limit demo command:

```bash
pnpm --filter @agentguard/x402-demo-api agent:over-limit
```

Then show tests or program checks.

Say:

> Now we try an over-limit payment. The program rejects it before transfer, and the output confirms that vault and merchant balances are unchanged. The program checks authority, merchant allowlist, per-transaction limit, daily limit, merchant cap, paused status, mint, vault, and merchant token owner before token transfer CPI.

Optional command:

```bash
pnpm test:ts
```

Expected result:

```text
16 passing
```

## 2:25-2:45: Receipt Verification

Show `services/x402-demo-api/src/protocol.ts`.

Say:

> The demo API decodes the `PaymentReceipt` account and verifies the agent profile, merchant, amount, and request hash against the challenge. It does not accept a client claim without checking the on-chain receipt.

## 2:45-3:00: Pause Action And Close

Run:

```bash
pnpm --filter @agentguard/x402-demo-api check:pause-action
```

Say:

> The web app exposes a Solana Action-style endpoint that returns an owner-signed pause transaction. This is the human override path for controlled agent spending.

## Technical Notes To Avoid Overclaiming

- The dashboard is an MVP view, not yet a full wallet-connected management app.
- The demo uses a local test SPL token, not production USDC.
- The x402 flow is x402-style, not a full facilitator implementation.
- The pause endpoint generates a transaction for signing; it is not yet a full production Blink integration.
