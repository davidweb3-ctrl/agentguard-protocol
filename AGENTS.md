# AgentGuard Protocol Agent Instructions

## Project Context

AgentGuard Protocol is a Solana-native agent spending firewall.

Tagline:

> Programmable spending limits for autonomous agents on Solana.

Core narrative:

> Give agents budgets, not private keys.

The MVP must prove that AI agents can pay on Solana only inside owner-defined on-chain policies.

This project is not an AI wallet, not a DeFi bot, and not a full x402 facilitator.

## Hard Rules

All repository-facing content must be written in English.

Do not develop feature work directly on `main` unless the user explicitly asks.

Do not overwrite, revert, or discard user changes unless the user explicitly requests it.

Do not commit secrets, private keys, wallet keypairs, `.env` files, local ledgers, dependency directories, build output, or generated cache artifacts.

Do not introduce real mainnet custody behavior for the hackathon MVP.

Before changing payment, policy, PDA, or account-constraint logic, inspect the relevant program, SDK, and test files first.

## Solana Safety Rules

All policy checks must happen before token transfer CPI.

Payment logic must enforce:

- Agent authority
- Merchant allowlist
- Per-transaction limit
- Daily limit
- Merchant cap
- Paused status
- Receipt PDA creation after successful payment

Rejected payments must not move funds.

Use checked arithmetic for spending counters and token amounts.

PDA seeds must stay consistent across program, SDK, tests, and demo scripts.

Request hash uniqueness should prevent replay for the same request by deriving receipts from `agentProfile` and `requestHash`.

Post-MVP emergency controls may include multisig, stronger replay domains, and broader pause controls.

## Verification Gating

Run relevant verification before committing.

For program or payment logic changes:

```bash
anchor build
pnpm test:ts
```

For TypeScript package changes:

```bash
pnpm -r typecheck
pnpm lint
```

For web changes:

```bash
pnpm --filter @agentguard/web build
```

Do not commit a failing state unless the user explicitly approves and the failure is documented.

Do not weaken policy checks, disable tests, or bypass verification to make a failure disappear.

## Failure Handling

If verification fails:

1. Read the error carefully.
2. Fix the issue in the current branch.
3. Re-run the relevant verification.
4. Ask the user when the failure requires a product or security decision.

Do not force push unless the user explicitly authorizes it.

Do not use destructive git commands unless explicitly requested.
