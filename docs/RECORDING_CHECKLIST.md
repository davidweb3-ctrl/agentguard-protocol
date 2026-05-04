# Recording Checklist

Use this checklist before recording the pitch video and technical demo video.

## Before Recording

Confirm the repo is clean and verified:

```bash
git status --short --branch
pnpm lint
pnpm -r typecheck
pnpm --filter @agentguard/web build
pnpm test:ts
```

Prepare the screen:

- use English system/browser/terminal where possible
- increase terminal font size
- use a clean terminal theme
- close notifications
- close unrelated browser tabs
- keep the GitHub repo or README visible for the opening shot
- make sure video links will be public or unlisted but accessible

## Terminal Layout

Prepare four terminals:

### Terminal 1: Validator

```bash
anchor build
solana-test-validator --reset \
  --bpf-program 3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838 \
  target/deploy/agentguard_protocol.so
```

Keep this running.

### Terminal 2: Seed And API

```bash
pnpm --filter @agentguard/x402-demo-api seed
set -a && source .env.demo && set +a
pnpm --filter @agentguard/x402-demo-api dev
```

Keep this running after the API starts.

Expected line:

```text
AgentGuard x402 demo API listening on 8787
```

### Terminal 3: Web Dashboard

```bash
set -a && source .env.demo && set +a
pnpm --filter @agentguard/web dev
```

Open:

```text
http://127.0.0.1:3000
```

### Terminal 4: Demo Commands

Load env once:

```bash
set -a && source .env.demo && set +a
```

Normal payment:

```bash
pnpm --filter @agentguard/x402-demo-api agent
```

Over-limit rejection:

```bash
pnpm --filter @agentguard/x402-demo-api agent:over-limit
```

Pause Action checker:

```bash
pnpm --filter @agentguard/x402-demo-api check:pause-action
```

## Pitch Video Shot List

Use [docs/PITCH_VIDEO_SCRIPT.md](PITCH_VIDEO_SCRIPT.md).

Recommended shots:

1. README title and tagline.
2. Dashboard policy cards.
3. Short terminal output from normal agent payment.
4. Business model doc or target customer bullets.
5. Tagline closing.

Key outputs to show briefly:

- `payment_required`
- `receiptPda`
- `paidStatus: 200`
- `balancesUnchanged: true` if there is time

Do not over-explain code in the pitch video.

## Technical Demo Shot List

Use [docs/TECHNICAL_DEMO_SCRIPT.md](TECHNICAL_DEMO_SCRIPT.md).

Recommended shots:

1. Repository layout.
2. Anchor program account structs:
   - `AgentProfile`
   - `MerchantPolicy`
   - `PaymentReceipt`
3. Validator and seed output.
4. Normal agent payment command.
5. Normal payment output:
   - 402 challenge fields
   - `txSignature`
   - `receiptPda`
   - `paidStatus: 200`
6. Over-limit rejection command.
7. Over-limit output:
   - `expectedRejection: true`
   - `balancesUnchanged: true`
   - vault before/after
   - merchant before/after
8. Receipt verification code in `services/x402-demo-api/src/protocol.ts`.
9. Pause Action checker output.
10. Test result: `16 passing`.

## Lines To Say For Over-Limit Demo

Use this exact wording if helpful:

> Now we try an over-limit payment. The program rejects it before the SPL token transfer, and the output confirms that both the vault balance and merchant balance are unchanged.

## Avoid Overclaiming

Do not say:

- "This is devnet USDC."
- "The dashboard creates the vault with a connected wallet."
- "This is a full production x402 facilitator."
- "The Blink is fully production-ready."
- "Here is the public Explorer link."

Say instead:

- "This is a local test SPL token representing USDC for the demo."
- "The seed script creates the local demo state."
- "This is an x402-style demo flow."
- "This is a Solana Action-style pause transaction generator."
- "Devnet deployment and wallet-connected dashboard are post-MVP milestones."

## Backup Outputs

If live recording is unstable, use already rehearsed outputs:

- `paidStatus: 200`
- `receiptPda`
- `txSignature`
- `expectedRejection: true`
- `balancesUnchanged: true`
- pause action transaction `byteLength: 212`

## Final Upload Check

Before submitting:

- pitch video is 3 minutes or less
- technical demo video is 2-3 minutes
- both videos are in English
- both links are accessible to judges
- GitHub repo is public or accessible
- README is clear at the top
- [docs/SUBMISSION.md](SUBMISSION.md) is ready to copy from
