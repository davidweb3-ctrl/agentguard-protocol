# Scripts

Planned scripts:

- `create-test-mint.ts`: create a local or devnet test token that stands in for USDC.
- `pnpm --filter @agentguard/x402-demo-api seed`: create an agent, deposit tokens, add a merchant policy, and write `.env.demo`.
- `pnpm --filter @agentguard/x402-demo-api agent`: call the demo API, pay the 402 challenge, and retry.

Demo flow:

```bash
pnpm --filter @agentguard/x402-demo-api seed
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api dev
pnpm --filter @agentguard/x402-demo-api agent
```
