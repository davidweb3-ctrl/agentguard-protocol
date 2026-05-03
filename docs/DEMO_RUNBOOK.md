# AgentGuard MVP Demo Runbook

This runbook rehearses the Solana Frontier Hackathon MVP from a clean localnet.

## Goal

Prove that an autonomous agent can pay for a paid API on Solana only inside an owner-defined policy vault:

1. Owner creates and funds an agent policy vault.
2. Owner allowlists one merchant.
3. API returns an HTTP 402-style challenge.
4. Agent pays through `agent_pay`.
5. Program checks authority, allowlist, limits, caps, and paused status before transfer.
6. Program creates a `PaymentReceipt` PDA.
7. Agent retries the API with the receipt proof.
8. Owner can pause the agent through a Solana Action endpoint.

## Prerequisites

- Solana CLI with `solana-test-validator`
- Anchor 0.32.1
- pnpm
- A local Solana wallet at `~/.config/solana/id.json`

Run once before the rehearsal:

```bash
pnpm install
anchor build
```

## Terminal 1: Start Localnet

```bash
anchor localnet
```

Keep this terminal running.

If `anchor localnet` fails on your machine, use:

```bash
solana-test-validator --reset \
  --bpf-program 3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838 \
  target/deploy/agentguard_protocol.so
```

## Terminal 2: Seed Demo State

```bash
pnpm --filter @agentguard/x402-demo-api seed
set -a && source .env.demo && set +a
```

Expected result:

- `.env.demo` is created.
- The output includes `owner`, `agentAuthority`, `merchant`, `agentProfile`, `vault`, and `merchantPolicy`.
- The vault is funded with the test SPL token used as demo USDC.

## Terminal 3: Start Paid API

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api dev
```

Expected result:

```text
AgentGuard x402 demo API listening on 8787
```

## Terminal 4: Run Agent Payment

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api agent
```

Expected result:

- The first request receives a 402 challenge.
- The agent submits `agent_pay`.
- The output includes `proof.receiptPda` and `paidStatus: 200`.
- The paid response contains `paid API response unlocked by AgentGuard receipt`.

## Terminal 5: Start Dashboard And Check Pause Action

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/web dev
```

Open:

```text
http://127.0.0.1:3000
```

In another terminal, verify the Solana Action response:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api check:pause-action
```

Expected result:

- The checker prints Action metadata with `Pause AgentGuard Agent`.
- The checker prints a non-zero transaction byte length.

## Demo Talking Points

- AgentGuard gives agents budgets, not private keys.
- The agent signs as `agentAuthority`, but the program only releases funds after policy checks pass.
- The owner controls allowlisted merchants, transaction limits, daily limits, merchant caps, and pause state.
- The paid API uses the receipt PDA as proof that payment happened on-chain.
- The pause Action is the human override path for a live agent.

## Troubleshooting

If the agent gets an invalid proof response:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api agent
```

Confirm that `DEMO_AGENT_PROFILE`, `DEMO_MINT`, `DEMO_MERCHANT`, and `DEMO_MERCHANT_TOKEN_ACCOUNT` all came from the latest `seed` run.

If the pause action checker cannot get a blockhash, make sure localnet is running and `.env.demo` has:

```bash
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
```

If a port is already in use:

- Change `DEMO_API_PORT` for the paid API.
- Change `DEMO_WEB_URL` and start the web app with another port:

```bash
pnpm --filter @agentguard/web exec next dev -p 3100
```
