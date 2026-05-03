import type { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

export const AGENTGUARD_PROGRAM_ID = new PublicKey(
  "3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838"
);

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export type AmountLike = BN | bigint | number | string;
export type RequestHash = Uint8Array | number[];
export type AgentGuardProgram = Program;

export interface InitializeAgentInstructionParams {
  program: AgentGuardProgram;
  owner: PublicKey;
  mint: PublicKey;
  agentAuthority: PublicKey;
  perTxLimit: AmountLike;
  dailyLimit: AmountLike;
}

export interface DepositInstructionParams {
  program: AgentGuardProgram;
  owner: PublicKey;
  mint: PublicKey;
  agentAuthority: PublicKey;
  ownerTokenAccount: PublicKey;
  amount: AmountLike;
}

export interface AddMerchantInstructionParams {
  program: AgentGuardProgram;
  owner: PublicKey;
  agentAuthority: PublicKey;
  merchant: PublicKey;
  maxPerPayment: AmountLike;
}

export interface SetPolicyInstructionParams {
  program: AgentGuardProgram;
  owner: PublicKey;
  agentAuthority: PublicKey;
  perTxLimit: AmountLike;
  dailyLimit: AmountLike;
}

export interface SetPauseInstructionParams {
  program: AgentGuardProgram;
  owner: PublicKey;
  agentAuthority: PublicKey;
  paused: boolean;
}

export interface SetPauseRawInstructionParams {
  owner: PublicKey;
  agentProfile: PublicKey;
  paused: boolean;
  programId?: PublicKey;
}

export interface AgentPayInstructionParams {
  program: AgentGuardProgram;
  agentAuthority: PublicKey;
  agentProfile: PublicKey;
  mint: PublicKey;
  merchant: PublicKey;
  merchantTokenAccount: PublicKey;
  amount: AmountLike;
  requestHash: RequestHash;
  vault?: PublicKey;
}

export function deriveAgentProfile(
  owner: PublicKey,
  agentAuthority: PublicKey,
  programId = AGENTGUARD_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), owner.toBuffer(), agentAuthority.toBuffer()],
    programId
  );
}

export function deriveVaultAuthority(
  agentProfile: PublicKey,
  programId = AGENTGUARD_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault-authority"), agentProfile.toBuffer()],
    programId
  );
}

export function deriveVault(
  agentProfile: PublicKey,
  programId = AGENTGUARD_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), agentProfile.toBuffer()],
    programId
  );
}

export function deriveMerchantPolicy(
  agentProfile: PublicKey,
  merchant: PublicKey,
  programId = AGENTGUARD_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merchant"), agentProfile.toBuffer(), merchant.toBuffer()],
    programId
  );
}

export function normalizeRequestHash(requestHash: RequestHash) {
  const bytes = Uint8Array.from(requestHash);

  if (bytes.length !== 32) {
    throw new Error("requestHash must be 32 bytes");
  }

  return bytes;
}

export function deriveReceipt(
  agentProfile: PublicKey,
  requestHash: RequestHash,
  programId = AGENTGUARD_PROGRAM_ID
) {
  const requestHashBytes = normalizeRequestHash(requestHash);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), agentProfile.toBuffer(), requestHashBytes],
    programId
  );
}

export function createTransaction(...instructions: TransactionInstruction[]) {
  return new Transaction().add(...instructions);
}

export async function buildInitializeAgentInstruction({
  program,
  owner,
  mint,
  agentAuthority,
  perTxLimit,
  dailyLimit,
}: InitializeAgentInstructionParams) {
  const [agentProfile] = deriveAgentProfile(
    owner,
    agentAuthority,
    program.programId
  );
  const [vaultAuthority] = deriveVaultAuthority(
    agentProfile,
    program.programId
  );
  const [vault] = deriveVault(agentProfile, program.programId);

  return program.methods
    .initializeAgent(agentAuthority, toBn(perTxLimit), toBn(dailyLimit))
    .accounts({
      owner,
      mint,
      agentProfile,
      vaultAuthority,
      vault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();
}

export async function buildDepositInstruction({
  program,
  owner,
  mint,
  agentAuthority,
  ownerTokenAccount,
  amount,
}: DepositInstructionParams) {
  const [agentProfile] = deriveAgentProfile(
    owner,
    agentAuthority,
    program.programId
  );
  const [vault] = deriveVault(agentProfile, program.programId);

  return program.methods
    .deposit(toBn(amount))
    .accounts({
      owner,
      agentProfile,
      mint,
      ownerTokenAccount,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

export async function buildAddMerchantInstruction({
  program,
  owner,
  agentAuthority,
  merchant,
  maxPerPayment,
}: AddMerchantInstructionParams) {
  const [agentProfile] = deriveAgentProfile(
    owner,
    agentAuthority,
    program.programId
  );
  const [merchantPolicy] = deriveMerchantPolicy(
    agentProfile,
    merchant,
    program.programId
  );

  return program.methods
    .addMerchant(merchant, toBn(maxPerPayment))
    .accounts({
      owner,
      agentProfile,
      merchantPolicy,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function buildSetPolicyInstruction({
  program,
  owner,
  agentAuthority,
  perTxLimit,
  dailyLimit,
}: SetPolicyInstructionParams) {
  const [agentProfile] = deriveAgentProfile(
    owner,
    agentAuthority,
    program.programId
  );

  return program.methods
    .setPolicy(toBn(perTxLimit), toBn(dailyLimit))
    .accounts({
      owner,
      agentProfile,
    })
    .instruction();
}

export async function buildSetPauseInstruction({
  program,
  owner,
  agentAuthority,
  paused,
}: SetPauseInstructionParams) {
  const [agentProfile] = deriveAgentProfile(
    owner,
    agentAuthority,
    program.programId
  );

  return program.methods
    .setPause(paused)
    .accounts({
      owner,
      agentProfile,
    })
    .instruction();
}

export function buildSetPauseRawInstruction({
  owner,
  agentProfile,
  paused,
  programId = AGENTGUARD_PROGRAM_ID,
}: SetPauseRawInstructionParams) {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: agentProfile, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([...SET_PAUSE_DISCRIMINATOR, paused ? 1 : 0]),
  });
}

export async function buildAgentPayInstruction({
  program,
  agentAuthority,
  agentProfile,
  mint,
  merchant,
  merchantTokenAccount,
  amount,
  requestHash,
  vault,
}: AgentPayInstructionParams) {
  const requestHashBytes = normalizeRequestHash(requestHash);
  const [vaultAuthority] = deriveVaultAuthority(
    agentProfile,
    program.programId
  );
  const [derivedVault] = deriveVault(agentProfile, program.programId);
  const [merchantPolicy] = deriveMerchantPolicy(
    agentProfile,
    merchant,
    program.programId
  );
  const [receipt] = deriveReceipt(
    agentProfile,
    requestHashBytes,
    program.programId
  );

  return program.methods
    .agentPay(toBn(amount), Array.from(requestHashBytes))
    .accounts({
      agentAuthority,
      agentProfile,
      mint,
      vaultAuthority,
      vault: vault ?? derivedVault,
      merchantPolicy,
      merchantTokenAccount,
      receipt,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

function toBn(amount: AmountLike) {
  if (BN.isBN(amount)) {
    return amount;
  }

  return new BN(amount.toString());
}

const SET_PAUSE_DISCRIMINATOR = [63, 32, 154, 2, 56, 103, 79, 45];
