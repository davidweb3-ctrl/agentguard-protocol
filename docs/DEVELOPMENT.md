# Development Guide

## Project Goal

AgentGuard Protocol is a Solana-native spending firewall for autonomous agents.

The hackathon MVP demonstrates an x402-style paid API flow where an AI agent pays on Solana only within owner-defined on-chain policies.

## Glossary

- Agent: An AI system authorized to submit constrained payment transactions.
- Policy: On-chain rules that limit agent spending.
- Vault: Token account funded by the owner and controlled by the program.
- Merchant: Allowlisted payment recipient.
- Receipt PDA: On-chain proof created after a successful payment.
- x402-style flow: HTTP 402 payment challenge, on-chain payment, then paid retry.
- Slice: A small, complete, demoable increment of functionality.

## Development Modes

### Hackathon Mode

Current mode.

Focus on proving the shortest credible demo loop:

```text
402 challenge -> agent_pay -> receipt -> retry success -> over-limit rejection
```

Use lightweight verification and critical-path tests. Coverage percentage targets are not enforced during the MVP.

### Production Mode

Post-hackathon hardening may add mandatory CI gates, coverage thresholds, deeper reviews, multisig controls, stronger replay domains, and broader monitoring.

## Branching

Keep `main` stable.

Use short-lived branches:

```bash
git checkout main
git pull
git checkout -b codex/<task-name>
```

Examples:

```text
codex/core-policy-engine
codex/single-payment-flow
codex/x402-demo-flow
codex/dashboard-view
```

## Outcome-Driven Slices

### Slice 1: Core Policy Engine

Done when:

- The program can decide allow or deny before token transfer.
- Tests cover agent authority, merchant allowlist, limits, merchant cap, and paused status.
- Rejection tests verify balances remain unchanged.

Quick start:

```bash
pnpm test:ts
anchor build
```

### Slice 2: Single Payment Flow

Done when:

- Owner initializes an agent profile and vault.
- Owner deposits test SPL token.
- Owner adds an allowlisted merchant.
- Agent pays successfully within policy.
- An over-limit payment is rejected before funds move.

### Slice 3: Receipt And Audit

Done when:

- Successful payment creates a receipt PDA.
- Proof object includes `agentProfile`, `requestHash`, `receiptPda`, and `txSignature`.
- Duplicate request hash cannot create a second successful receipt for the same profile.

### Slice 4: Dashboard View

Done when:

- Owner can view policy, vault, merchant, paused state, and demo receipt state.
- Owner can initialize or manage supported MVP controls.
- Full payment history indexing remains post-MVP unless explicitly prioritized.

### Slice 5: Blink Pause

Done when:

- Blink or Action can pause the agent.
- Paused agent cannot pay.
- Demo clearly shows owner override.

## Verification

Use checks relevant to the changed area:

```bash
anchor build
pnpm test:ts
pnpm -r typecheck
pnpm lint
pnpm --filter @agentguard/web build
```

Program and payment changes must prioritize critical-path safety over percentage coverage.

## CI Phases

Before demo day:

- `anchor build`
- `pnpm test:ts`
- Secret scanning

Post-hackathon:

- `pnpm -r typecheck`
- `pnpm lint`
- Branch-name validation
- Coverage reporting
- Coverage thresholds
- Stronger security review gates

## Pre-Commit Checklist

Before committing:

Code:

- Repository-facing text is English.
- No secrets, keypairs, `.env`, local ledger, dependency, or build output files are staged.
- Commit message is concise and English.

Program safety, if payment logic changed:

- Policy checks happen before token transfer CPI.
- Rejected payments leave balances unchanged.
- Checked arithmetic is used.
- PDA seeds match program, SDK, tests, and demo scripts.

Verification:

- Relevant checks pass.
- Any skipped check is documented.
