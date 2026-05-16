# Pitch Voiceover

Use this script for the 3-minute pitch video voiceover. It is written for AI narration or a slow, clear human read.

Target duration: about 2 minutes 45 seconds.

## Timeline

| Time      | Slide | Visual             |
| --------- | ----- | ------------------ |
| 0:00-0:20 | 1     | Title              |
| 0:20-0:50 | 2     | Problem            |
| 0:50-1:22 | 4     | Product            |
| 1:22-2:07 | 5     | MVP Proof          |
| 2:07-2:43 | 6     | Business + Roadmap |

The generated pitch video skips the standalone "Timing" slide because the current
voiceover moves directly from the problem into the product.

## Clean Voiceover Script

Hi, I am David Shah, solo founder of AgentGuard Protocol.

I am a former Alibaba engineer with a background in distributed systems and production safety.

This is my first Solana hackathon project, built solo plus AI.

AgentGuard applies safety engineering to autonomous agent spending.

AI agents are starting to act for users and teams.

The next step is payments.

APIs, data, compute, infrastructure, and on-chain services.

But giving an agent a private key with broad spending power is unsafe.

If the agent is buggy or compromised, it can overspend or drain funds.

AgentGuard solves this with one simple idea:

Give agents budgets, not private keys.

AgentGuard is a Solana-native spending firewall for autonomous agents.

The owner creates a policy vault, deposits the test token, allowlists merchants, sets spending limits, and can pause the agent at any time.

The agent can pay, but only through the AgentGuard program.

Before any token transfer happens, the program checks agent authority, merchant allowlist, per-transaction limit, daily limit, merchant cap, paused status, mint, and vault constraints.

The MVP runs an end-to-end x402-style payment flow.

First, an agent calls a paid API and receives a payment challenge.

The agent submits `agent_pay` through AgentGuard.

The Solana program checks the policy before funds move.

If the payment is valid, it transfers the test token and creates a PaymentReceipt PDA.

The agent retries the API with that receipt, and the API returns paid data.

Then the demo tries an over-limit payment.

It is rejected before transfer, and the demo confirms balances are unchanged.

So the proof is not just that an agent can pay.

The proof is that an agent can pay only inside owner-defined on-chain policy.

The first users are Solana agent builders and paid API providers.

The next users are DAO automation teams, trading and ops bots, and agent wallet or framework providers.

The open-source protocol builds trust.

The business can grow around a hosted dashboard, per-agent pricing, payment volume fees, premium monitoring, and enterprise policy hosting.

AgentGuard Protocol is a programmable spending limit layer for autonomous agents on Solana.

Give agents budgets, not private keys.

## Per-Slide Read Notes

### Slide 1: Title

Read through the founder background and tagline.

### Slide 2: Problem

Pause slightly after "The next step is payments."

### Slide 4: Product

Emphasize "The agent can pay, but only through the AgentGuard program."

### Slide 5: MVP Proof

This is the most important section. Slow down slightly on:

- 402-style payment challenge
- Policy before funds move
- PaymentReceipt PDA
- Balances are unchanged

### Slide 6: Business + Roadmap

End with the tagline.
