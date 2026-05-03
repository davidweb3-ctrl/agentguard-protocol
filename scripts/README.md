# Scripts

Planned scripts:

- `create-test-mint.ts`: create a local or devnet test token that stands in for USDC.
- `seed-demo.ts`: create an agent, deposit tokens, and add a merchant policy.
- `pnpm --filter @agentguard/x402-demo-api agent`: call the demo API, pay the 402 challenge, and retry.

The agent client expects an already seeded AgentGuard profile, vault, merchant policy, and merchant token account.
Set the values in `.env.example`, run the demo API, then run the agent client.
