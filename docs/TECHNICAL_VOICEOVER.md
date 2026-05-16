# Technical Voiceover

Use this script for the 2-3 minute technical demo video voiceover.

Target duration: about 2 minutes 35 seconds.

## Clean Voiceover Script

This is the AgentGuard Protocol technical demo.

First, where does AgentGuard fit?

X four oh two style payments define the challenge and retry pattern.

Without AgentGuard, an agent receives a challenge, pays a merchant, then retries the API with proof.

Payment can happen, but no Solana policy layer enforces the owner budget before transfer.

AgentGuard adds that policy layer.

The agent still follows challenge and retry, but payment goes through AgentGuard first.

The program checks policy before funds move, creates a PaymentReceipt P D A, and the API unlocks only when that receipt matches.

The system has four main parts.

The agent client receives the challenge. The TypeScript SDK builds instructions. The Anchor program enforces policy and creates receipts. The API verifies receipts.

The pause Action gives the owner a human override path.

The on-chain safety model centers on AgentProfile, MerchantPolicy, and PaymentReceipt.

Before S P L token transfer C P I, the program checks agent authority, merchant allowlist, per-transaction limit, daily limit, merchant cap, paused status, mint, vault, and token owner.

Now Run one: a valid agent payment.

The agent calls a paid API and receives payment required.

It submits agent pay through AgentGuard.

The program checks policy before transfer.

Because the payment is within policy, the program transfers the test token, creates a receipt P D A, and retry returns paidStatus two hundred.

Now Run two: an over-limit payment.

The same agent pays above the per-transaction limit.

This time, the program rejects before token transfer.

The output confirms expectedRejection true and balancesUnchanged true.

The vault and merchant balances stay unchanged. That is the key safety property.

The API uses receipt-backed unlocks.

It reads the PaymentReceipt account and checks it against the challenge.

Finally, the pause Action supports human override, and tests cover success, rejection paths, receipt creation, and unchanged balances.

The proof is simple: an agent can pay on Solana only through owner-defined on-chain policy.
