import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as anchor from "@coral-xyz/anchor";
import {
  buildAgentPayInstruction,
  createTransaction,
  deriveReceipt,
} from "@agentguard/sdk";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import { PaymentChallenge, PaymentProof, hexToBytes } from "./protocol.js";

const DEFAULT_API_URL = "http://127.0.0.1:8787/paid/weather-alpha";
const DEFAULT_IDL_PATH = "target/idl/agentguard_protocol.json";

async function main() {
  const apiUrl = process.env.DEMO_API_URL ?? DEFAULT_API_URL;
  const rpcUrl = process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899";
  const agentAuthorityPath = resolvePath(
    requiredEnv("AGENT_AUTHORITY_KEYPAIR")
  );
  const idlPath = resolvePath(
    process.env.AGENTGUARD_IDL_PATH ?? DEFAULT_IDL_PATH
  );

  const agentAuthority = readKeypair(agentAuthorityPath);
  const connection = new Connection(rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(agentAuthority);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl, provider);

  const challengeResponse = await fetch(apiUrl);

  if (challengeResponse.status !== 402) {
    throw new Error(`Expected 402 challenge, got ${challengeResponse.status}`);
  }

  const challenge = (await challengeResponse.json()) as PaymentChallenge;
  const requestHash = hexToBytes(challenge.requestHash);
  const agentProfile = new PublicKey(challenge.agentProfile);
  const [receiptPda] = deriveReceipt(
    agentProfile,
    requestHash,
    program.programId
  );

  const instruction = await buildAgentPayInstruction({
    program,
    agentAuthority: agentAuthority.publicKey,
    agentProfile,
    mint: new PublicKey(challenge.mint),
    merchant: new PublicKey(challenge.merchant),
    merchantTokenAccount: new PublicKey(challenge.merchantTokenAccount),
    amount: challenge.amount,
    requestHash,
  });

  const txSignature = await sendAndConfirmTransaction(
    connection,
    createTransaction(instruction),
    [agentAuthority],
    { commitment: "confirmed" }
  );
  const proof: PaymentProof = {
    agentProfile: challenge.agentProfile,
    requestHash: challenge.requestHash,
    receiptPda: receiptPda.toBase58(),
    txSignature,
  };

  const paidResponse = await fetch(apiUrl, {
    headers: {
      "x-agentguard-proof": JSON.stringify(proof),
    },
  });
  const paidBody = await paidResponse.json();

  console.log(
    JSON.stringify(
      {
        challenge,
        proof,
        paidStatus: paidResponse.status,
        paidBody,
      },
      null,
      2
    )
  );
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readKeypair(path: string) {
  const secretKey = JSON.parse(fs.readFileSync(path, "utf8"));

  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function resolvePath(value: string) {
  if (value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(process.env.INIT_CWD ?? process.cwd(), value);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
