import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as anchor from "@coral-xyz/anchor";
import {
  buildAgentPayInstruction,
  createTransaction,
  deriveVault,
} from "@agentguard/sdk";
import { getAccount } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const DEFAULT_IDL_PATH = "target/idl/agentguard_protocol.json";
const DEFAULT_OVER_LIMIT_AMOUNT = "10001";

async function main() {
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
  const agentProfile = new PublicKey(requiredEnv("DEMO_AGENT_PROFILE"));
  const mint = new PublicKey(requiredEnv("DEMO_MINT"));
  const merchant = new PublicKey(requiredEnv("DEMO_MERCHANT"));
  const merchantTokenAccount = new PublicKey(
    requiredEnv("DEMO_MERCHANT_TOKEN_ACCOUNT")
  );
  const amount =
    process.env.DEMO_OVER_LIMIT_AMOUNT ?? DEFAULT_OVER_LIMIT_AMOUNT;
  const requestHash = buildRequestHash();
  const [vault] = deriveVault(agentProfile, program.programId);
  const vaultBefore = await tokenBalance(connection, vault);
  const merchantBefore = await tokenBalance(connection, merchantTokenAccount);
  const instruction = await buildAgentPayInstruction({
    program,
    agentAuthority: agentAuthority.publicKey,
    agentProfile,
    mint,
    merchant,
    merchantTokenAccount,
    amount,
    requestHash,
  });

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      createTransaction(instruction),
      [agentAuthority],
      { commitment: "confirmed" }
    );

    throw new Error(`Expected over-limit payment to fail, got ${signature}`);
  } catch (error) {
    const vaultAfter = await tokenBalance(connection, vault);
    const merchantAfter = await tokenBalance(connection, merchantTokenAccount);
    const balancesUnchanged =
      vaultAfter === vaultBefore && merchantAfter === merchantBefore;

    if (!balancesUnchanged) {
      throw new Error("Over-limit rejection moved funds unexpectedly.");
    }

    console.log(
      JSON.stringify(
        {
          expectedRejection: true,
          amount,
          requestHash: Buffer.from(requestHash).toString("hex"),
          balancesUnchanged,
          vault: {
            before: vaultBefore.toString(),
            after: vaultAfter.toString(),
          },
          merchantTokenAccount: {
            before: merchantBefore.toString(),
            after: merchantAfter.toString(),
          },
          error: summarizeError(error),
        },
        null,
        2
      )
    );
  }
}

async function tokenBalance(connection: Connection, address: PublicKey) {
  const account = await getAccount(connection, address);

  return account.amount;
}

function buildRequestHash() {
  const requestHash = Buffer.alloc(32);
  requestHash.write("over-limit-demo");
  requestHash.writeBigUInt64LE(BigInt(Date.now()), 16);

  return Uint8Array.from(requestHash);
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readKeypair(keypairPath: string) {
  const secretKey = JSON.parse(
    fs.readFileSync(resolvePath(keypairPath), "utf8")
  );

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

function summarizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  return error.message.split("\n").slice(0, 4).join("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
