# MVP Scope

## Goal

Show that an AI agent can pay for an API on Solana while an on-chain policy vault enforces limits before funds move.

## Must Ship

- `initialize_agent`: creates agent profile and token vault.
- `deposit`: owner funds the vault.
- `add_merchant`: owner allowlists a merchant wallet and payment cap.
- `set_policy`: owner updates per-transaction and daily limits.
- `set_pause`: owner pauses or resumes the agent.
- `agent_pay`: agent pays an allowlisted merchant and creates a receipt.
- Demo paid API with HTTP 402 style challenge and retry.
- Minimal dashboard showing vault, policy, merchants, and receipts.

## Cut Aggressively

- No real mainnet USDC in the demo.
- No generalized natural-language spending policy.
- No multi-agent organization support.
- No automated swaps.
- No custom token extensions in the first sprint.
- No marketplace.

## Demo Script

1. Owner creates an agent policy vault.
2. Owner deposits a test SPL token that represents USDC.
3. Owner allowlists a paid API merchant.
4. Agent calls API and gets a 402 challenge.
5. Agent pays through `agent_pay`.
6. API verifies the payment receipt and returns data.
7. Agent tries an over-limit payment and the program rejects it.
8. Owner pauses the agent from a Blink or dashboard action.

## Success Criteria

- The demo includes at least one successful Solana transaction.
- The demo includes at least one rejected transaction before transfer.
- A receipt PDA can be inspected from the UI or CLI.
- The code is open source and easy for judges to run locally.
