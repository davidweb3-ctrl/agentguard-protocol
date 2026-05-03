import { createHash } from "node:crypto";

import {
  AGENTGUARD_PROGRAM_ID,
  deriveReceipt,
  normalizeRequestHash,
} from "@agentguard/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

export const DEMO_ENDPOINT = "/paid/weather-alpha";
export const DEMO_RESOURCE = "weather-alpha";

export interface PaymentChallenge {
  error: "payment_required";
  protocol: "agentguard-x402-demo";
  endpoint: string;
  resource: string;
  amount: string;
  token: string;
  mint: string;
  merchant: string;
  merchantTokenAccount: string;
  agentProfile: string;
  programId: string;
  requestHash: string;
  instructions: string;
}

export interface PaymentProof {
  agentProfile: string;
  requestHash: string;
  receiptPda: string;
  txSignature: string;
}

export interface PaymentReceiptAccount {
  agentProfile: string;
  agentAuthority: string;
  merchant: string;
  amount: bigint;
  requestHash: string;
  timestamp: bigint;
  windowStart: bigint;
}

export interface DemoConfig {
  amount: string;
  token: string;
  mint: string;
  merchant: string;
  merchantTokenAccount: string;
  agentProfile: string;
  programId: string;
  rpcUrl?: string;
  verifyOnchainReceipt: boolean;
}

export interface ProofValidationOptions {
  rpcUrl?: string;
  verifyOnchainReceipt?: boolean;
}

export function loadDemoConfig(env = process.env): DemoConfig {
  return {
    amount: env.DEMO_PAYMENT_AMOUNT ?? "10000",
    token: env.DEMO_TOKEN_LABEL ?? "test-usdc",
    mint: env.DEMO_MINT ?? "replace-with-test-token-mint",
    merchant: env.DEMO_MERCHANT ?? "replace-with-merchant-wallet",
    merchantTokenAccount:
      env.DEMO_MERCHANT_TOKEN_ACCOUNT ?? "replace-with-merchant-token-account",
    agentProfile: env.DEMO_AGENT_PROFILE ?? "replace-with-agent-profile-pda",
    programId:
      env.DEMO_AGENTGUARD_PROGRAM_ID ?? AGENTGUARD_PROGRAM_ID.toBase58(),
    rpcUrl: env.ANCHOR_PROVIDER_URL,
    verifyOnchainReceipt: env.DEMO_VERIFY_ONCHAIN_RECEIPT !== "false",
  };
}

export function buildPaymentChallenge(config: DemoConfig): PaymentChallenge {
  const requestHash = createRequestHash(config);

  return {
    error: "payment_required",
    protocol: "agentguard-x402-demo",
    endpoint: DEMO_ENDPOINT,
    resource: DEMO_RESOURCE,
    amount: config.amount,
    token: config.token,
    mint: config.mint,
    merchant: config.merchant,
    merchantTokenAccount: config.merchantTokenAccount,
    agentProfile: config.agentProfile,
    programId: config.programId,
    requestHash,
    instructions:
      "Submit AgentGuard agent_pay with the challenge fields, then retry with x-agentguard-proof.",
  };
}

export function parseProofHeader(headerValue: string | undefined) {
  if (!headerValue) {
    return null;
  }

  try {
    return JSON.parse(headerValue) as PaymentProof;
  } catch (_error) {
    return null;
  }
}

export async function validatePaymentProof(
  proof: PaymentProof,
  challenge: PaymentChallenge,
  options: ProofValidationOptions = {}
) {
  if (proof.agentProfile !== challenge.agentProfile) {
    return false;
  }

  if (proof.requestHash !== challenge.requestHash) {
    return false;
  }

  if (!proof.txSignature) {
    return false;
  }

  try {
    const programId = new PublicKey(challenge.programId);
    const [expectedReceipt] = deriveReceipt(
      new PublicKey(proof.agentProfile),
      hexToBytes(proof.requestHash),
      programId
    );

    if (expectedReceipt.toBase58() !== proof.receiptPda) {
      return false;
    }

    if (!options.verifyOnchainReceipt) {
      return true;
    }

    if (!options.rpcUrl) {
      return false;
    }

    const connection = new Connection(options.rpcUrl, "confirmed");
    const receiptAccount = await connection.getAccountInfo(expectedReceipt);

    if (!receiptAccount?.owner.equals(programId)) {
      return false;
    }

    const receipt = decodePaymentReceiptAccount(receiptAccount.data);

    return (
      receipt.agentProfile === challenge.agentProfile &&
      receipt.merchant === challenge.merchant &&
      receipt.requestHash === challenge.requestHash &&
      receipt.amount >= BigInt(challenge.amount)
    );
  } catch (_error) {
    return false;
  }
}

export function createRequestHash(config: DemoConfig) {
  const hash = createHash("sha256");
  hash.update("agentguard:x402-demo:v1");
  hash.update(DEMO_ENDPOINT);
  hash.update(config.amount);
  hash.update(config.token);
  hash.update(config.mint);
  hash.update(config.merchant);
  hash.update(config.merchantTokenAccount);
  hash.update(config.agentProfile);
  hash.update(config.programId);

  return hash.digest("hex");
}

export function hexToBytes(value: string) {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("requestHash must be a 32-byte hex string");
  }

  return normalizeRequestHash(Uint8Array.from(Buffer.from(value, "hex")));
}

export function decodePaymentReceiptAccount(
  data: Buffer
): PaymentReceiptAccount {
  if (data.length < PAYMENT_RECEIPT_ACCOUNT_SIZE) {
    throw new Error("PaymentReceipt account data is too short");
  }

  if (!data.subarray(0, 8).equals(PAYMENT_RECEIPT_DISCRIMINATOR)) {
    throw new Error("Invalid PaymentReceipt account discriminator");
  }

  return {
    agentProfile: readPublicKey(data, 8),
    agentAuthority: readPublicKey(data, 40),
    merchant: readPublicKey(data, 72),
    amount: data.readBigUInt64LE(104),
    requestHash: data.subarray(112, 144).toString("hex"),
    timestamp: data.readBigInt64LE(144),
    windowStart: data.readBigInt64LE(152),
  };
}

function readPublicKey(data: Buffer, offset: number) {
  return new PublicKey(data.subarray(offset, offset + 32)).toBase58();
}

const PAYMENT_RECEIPT_ACCOUNT_SIZE = 161;
const PAYMENT_RECEIPT_DISCRIMINATOR = Buffer.from([
  168, 198, 209, 4, 60, 235, 126, 109,
]);
