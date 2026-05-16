# Technical Video Plan

Use this plan for the 2-3 minute technical demo video. The pitch video explains why AgentGuard matters; this video proves what was built and how the Solana implementation works.

Target duration: about 2 minutes 45 seconds.

## Video Goal

Show that AgentGuard is a working Solana-native agent spending firewall:

- Anchor program enforces payment policy before SPL token transfer.
- SDK and demo API run an x402-style paid API flow.
- PaymentReceipt PDA is used as the payment proof.
- Over-limit payment is rejected before funds move.
- Pause Action endpoint provides a human override path.

## Final Output

```text
docs/final-video/agentguard-technical-video.mp4
```

## Visual Timeline

| Time      | Visual                                | Purpose                                    |
| --------- | ------------------------------------- | ------------------------------------------ |
| 0:00-0:18 | Before / After x402-style flow        | Show where AgentGuard sits                 |
| 0:18-0:34 | System architecture                   | Show implementation scope                  |
| 0:34-0:50 | On-chain safety model                 | Show Solana-native core                    |
| 0:50-1:05 | MVP payment flow                      | Show the full request lifecycle            |
| 1:05-1:42 | Run 1: valid payment succeeds         | Show receipt-backed success                |
| 1:42-2:18 | Run 2: over-limit payment rejected    | Show rejection before transfer             |
| 2:18-2:40 | Receipt verification and pause Action | Show proof verification and human override |
| 2:40-2:55 | Test summary and close                | Show verification                          |

## Must Show

Show these paths or outputs somewhere in the video:

```text
programs/agentguard-protocol/src/lib.rs
packages/sdk/
services/x402-demo-api/src/protocol.ts
services/x402-demo-api/src/agent-client.ts
apps/web/
tests/agentguard-protocol.ts
```

Show these proof outputs:

```text
payment_required
receiptPda
paidStatus: 200
expectedRejection: true
balancesUnchanged: true
16 passing
```

## Voiceover Script

Use [docs/TECHNICAL_VOICEOVER.md](TECHNICAL_VOICEOVER.md).

## Recording Strategy

Use generated clips for stability, but make them look like code and terminal walkthroughs instead of a marketing animation.

Recommended automated assets:

- `docs/technical-deck/index.html`: 6 visual sections for architecture and code walkthrough.
- `docs/technical-demo-clip/index.html`: terminal-focused command output sequence.
- `docs/final-video/technical-voiceover.mp3`: cloned voice narration.
- `scripts/render-technical-video.mjs`: final ffmpeg composition script.

## Avoid Overclaiming

Say:

- "local test SPL token"
- "x402-style demo flow"
- "Solana Action-style pause endpoint"
- "MVP dashboard"

Do not say:

- "production USDC"
- "full x402 facilitator"
- "fully production-ready Blink"
- "wallet-connected dashboard creates all state"
