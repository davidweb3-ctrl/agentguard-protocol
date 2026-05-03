import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as anchor from "@coral-xyz/anchor";
import {
  buildAddMerchantInstruction,
  buildDepositInstruction,
  buildInitializeAgentInstruction,
  createTransaction,
  deriveAgentProfile,
  deriveMerchantPolicy,
  deriveVault,
} from "@agentguard/sdk";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const DEFAULT_IDL_PATH = "target/idl/agentguard_protocol.json";
const DEFAULT_KEYS_DIR = ".keys";
const DEFAULT_ENV_OUTPUT_PATH = ".env.demo";
const DEFAULT_DEPOSIT_AMOUNT = "100000";
const DEFAULT_OWNER_MINT_AMOUNT = 1_000_000;
const DEFAULT_PER_TX_LIMIT = "10000";
const DEFAULT_DAILY_LIMIT = "30000";
const DEFAULT_MERCHANT_CAP = "10000";

async function main() {
  const rpcUrl = process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899";
  const ownerPath = requiredEnv("ANCHOR_WALLET");
  const idlPath = resolvePath(
    process.env.AGENTGUARD_IDL_PATH ?? DEFAULT_IDL_PATH
  );
  const keysDir = resolvePath(process.env.DEMO_KEYS_DIR ?? DEFAULT_KEYS_DIR);
  const envOutputPath = resolvePath(
    process.env.DEMO_ENV_OUTPUT ?? DEFAULT_ENV_OUTPUT_PATH
  );

  fs.mkdirSync(keysDir, { recursive: true });

  const owner = readKeypair(ownerPath);
  const agentAuthority = readOrCreateKeypair(
    path.join(keysDir, "agent-authority.json")
  );
  const merchant = readOrCreateKeypair(path.join(keysDir, "merchant.json"));
  const connection = new Connection(rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(owner);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl, provider);

  await maybeAirdrop(connection, owner.publicKey);
  await maybeAirdrop(connection, agentAuthority.publicKey);

  const mint = await createMint(connection, owner, owner.publicKey, null, 6);
  const ownerTokenAccount = await createAssociatedTokenAccount(
    connection,
    owner,
    mint,
    owner.publicKey
  );
  const merchantTokenAccount = await createAssociatedTokenAccount(
    connection,
    owner,
    mint,
    merchant.publicKey
  );

  await mintTo(
    connection,
    owner,
    mint,
    ownerTokenAccount,
    owner,
    DEFAULT_OWNER_MINT_AMOUNT
  );

  const [agentProfile] = deriveAgentProfile(
    owner.publicKey,
    agentAuthority.publicKey,
    program.programId
  );
  const [vault] = deriveVault(agentProfile, program.programId);
  const [merchantPolicy] = deriveMerchantPolicy(
    agentProfile,
    merchant.publicKey,
    program.programId
  );

  await sendAndConfirmTransaction(
    connection,
    createTransaction(
      await buildInitializeAgentInstruction({
        program,
        owner: owner.publicKey,
        mint,
        agentAuthority: agentAuthority.publicKey,
        perTxLimit: process.env.DEMO_PER_TX_LIMIT ?? DEFAULT_PER_TX_LIMIT,
        dailyLimit: process.env.DEMO_DAILY_LIMIT ?? DEFAULT_DAILY_LIMIT,
      })
    ),
    [owner],
    { commitment: "confirmed" }
  );

  await sendAndConfirmTransaction(
    connection,
    createTransaction(
      await buildDepositInstruction({
        program,
        owner: owner.publicKey,
        mint,
        agentAuthority: agentAuthority.publicKey,
        ownerTokenAccount,
        amount: process.env.DEMO_DEPOSIT_AMOUNT ?? DEFAULT_DEPOSIT_AMOUNT,
      })
    ),
    [owner],
    { commitment: "confirmed" }
  );

  await sendAndConfirmTransaction(
    connection,
    createTransaction(
      await buildAddMerchantInstruction({
        program,
        owner: owner.publicKey,
        agentAuthority: agentAuthority.publicKey,
        merchant: merchant.publicKey,
        maxPerPayment: process.env.DEMO_MERCHANT_CAP ?? DEFAULT_MERCHANT_CAP,
      })
    ),
    [owner],
    { commitment: "confirmed" }
  );

  const env = [
    `ANCHOR_PROVIDER_URL=${rpcUrl}`,
    `ANCHOR_WALLET=${resolvePath(ownerPath)}`,
    "DEMO_WEB_URL=http://127.0.0.1:3000",
    "DEMO_API_PORT=8787",
    "DEMO_API_URL=http://127.0.0.1:8787/paid/weather-alpha",
    "DEMO_PAYMENT_AMOUNT=10000",
    "DEMO_TOKEN_LABEL=test-usdc",
    `DEMO_OWNER=${owner.publicKey.toBase58()}`,
    `DEMO_MINT=${mint.toBase58()}`,
    `DEMO_MERCHANT=${merchant.publicKey.toBase58()}`,
    `DEMO_MERCHANT_TOKEN_ACCOUNT=${merchantTokenAccount.toBase58()}`,
    `DEMO_AGENT_PROFILE=${agentProfile.toBase58()}`,
    `DEMO_AGENTGUARD_PROGRAM_ID=${program.programId.toBase58()}`,
    `NEXT_PUBLIC_DEMO_AGENT_PROFILE=${agentProfile.toBase58()}`,
    `NEXT_PUBLIC_SOLANA_RPC_URL=${rpcUrl}`,
    `NEXT_PUBLIC_AGENTGUARD_PROGRAM_ID=${program.programId.toBase58()}`,
    "DEMO_VERIFY_ONCHAIN_RECEIPT=false",
    `AGENT_AUTHORITY_KEYPAIR=${resolvePath(
      path.join(keysDir, "agent-authority.json")
    )}`,
    `AGENTGUARD_IDL_PATH=${resolvePath(idlPath)}`,
  ].join("\n");

  fs.writeFileSync(envOutputPath, `${env}\n`);

  console.log(
    JSON.stringify(
      {
        envOutputPath,
        owner: owner.publicKey.toBase58(),
        agentAuthority: agentAuthority.publicKey.toBase58(),
        merchant: merchant.publicKey.toBase58(),
        mint: mint.toBase58(),
        ownerTokenAccount: ownerTokenAccount.toBase58(),
        merchantTokenAccount: merchantTokenAccount.toBase58(),
        agentProfile: agentProfile.toBase58(),
        vault: vault.toBase58(),
        merchantPolicy: merchantPolicy.toBase58(),
      },
      null,
      2
    )
  );
}

async function maybeAirdrop(connection: Connection, publicKey: PublicKey) {
  try {
    const signature = await connection.requestAirdrop(
      publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const blockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      },
      "confirmed"
    );
  } catch (_error) {
    // Devnet and funded local wallets may reject airdrops; continue with the current balance.
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readOrCreateKeypair(keypairPath: string) {
  const resolvedPath = resolvePath(keypairPath);

  if (fs.existsSync(resolvedPath)) {
    return readKeypair(resolvedPath);
  }

  const keypair = Keypair.generate();
  fs.writeFileSync(resolvedPath, JSON.stringify(Array.from(keypair.secretKey)));

  return keypair;
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
