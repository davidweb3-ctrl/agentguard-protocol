# Architecture

## Components

```text
Agent Client
  -> calls protected API
  -> receives 402 challenge
  -> builds agent_pay transaction with SDK
  -> retries API with transaction signature

x402 Demo API
  -> returns payment terms
  -> verifies receipt state or signature
  -> returns paid resource

Anchor Program
  -> stores AgentProfile
  -> stores MerchantPolicy
  -> enforces limits
  -> transfers SPL tokens from vault
  -> writes PaymentReceipt

Web Dashboard
  -> creates agent profile
  -> deposits test token
  -> configures policy
  -> displays receipts and decisions
  -> exposes Action/Blink endpoints
```

## Program Accounts

### AgentProfile

Stores owner, agent authority, mint, vault, spend limits, current daily spend window, pause state, and bumps.

### MerchantPolicy

Stores the merchant wallet, active flag, and max amount per payment.

### PaymentReceipt

Stores agent profile, agent authority, merchant, amount, request hash, timestamp, and window start.

## Instruction Set

- `initialize_agent(agent_authority, per_tx_limit, daily_limit)`
- `deposit(amount)`
- `set_policy(per_tx_limit, daily_limit)`
- `set_pause(paused)`
- `add_merchant(merchant, max_per_payment)`
- `agent_pay(amount, request_hash)`

## Security Model

- Owner controls policy and pause state.
- Agent authority can only call `agent_pay`.
- Program checks merchant allowlist before transfer.
- Program checks per-transaction and daily limits before transfer.
- Vault authority is a PDA and only signs inside program CPI.
- Receipt PDA is derived from profile and request hash to prevent duplicate receipts for the same request.

## Future Extensions

- One-time approval receipts for payments above normal limits.
- Session vouchers with time-bounded authority.
- Token-2022 metadata or memo-required attribution.
- Metaplex Agent Registry identity.
- Squads or team policy administration.
