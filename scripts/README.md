# Scripts

Planned scripts:

- `create-test-mint.ts`: create a local or devnet test token that stands in for USDC.
- `pnpm --filter @agentguard/x402-demo-api seed`: create an agent, deposit tokens, add a merchant policy, and write `.env.demo`.
- `pnpm --filter @agentguard/x402-demo-api agent`: call the demo API, pay the 402 challenge, and retry.
- `GET /api/actions/pause`: return Solana Action metadata for an owner-signed pause transaction.
- `POST /api/actions/pause`: return a serialized `set_pause(true)` transaction.

Demo flow:

```bash
pnpm --filter @agentguard/x402-demo-api seed
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api dev
pnpm --filter @agentguard/x402-demo-api agent
```

Blink pause flow:

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/web dev
curl "http://127.0.0.1:3000/api/actions/pause"
```

Wallets or Blink clients can post the owner wallet address to the same endpoint:

```bash
curl -X POST "http://127.0.0.1:3000/api/actions/pause" \
  -H "Content-Type: application/json" \
  -d '{"account":"replace-with-owner-wallet"}'
```

Full rehearsal:

- Follow `docs/DEMO_RUNBOOK.md` before recording or presenting the hackathon demo.
