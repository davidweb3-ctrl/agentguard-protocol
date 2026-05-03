import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";

import {
  buildAgentPayInstruction,
  buildInitializeAgentInstruction,
  buildSetPauseRawInstruction,
  createTransaction,
  deriveAgentProfile,
  deriveMerchantPolicy,
  deriveReceipt,
  deriveVault,
  deriveVaultAuthority,
  normalizeRequestHash,
} from "../packages/sdk/src/index";

describe("@agentguard/sdk", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AgentguardProtocol;

  function includesKey(
    instruction: anchor.web3.TransactionInstruction,
    publicKey: anchor.web3.PublicKey
  ) {
    return instruction.keys.some((key) => key.pubkey.equals(publicKey));
  }

  it("builds initialize agent instructions with derived policy accounts", async () => {
    const owner = anchor.web3.Keypair.generate().publicKey;
    const mint = anchor.web3.Keypair.generate().publicKey;
    const agentAuthority = anchor.web3.Keypair.generate().publicKey;
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

    const instruction = await buildInitializeAgentInstruction({
      program,
      owner,
      mint,
      agentAuthority,
      perTxLimit: 10_000,
      dailyLimit: 30_000,
    });

    expect(instruction.programId.equals(program.programId)).to.equal(true);
    expect(includesKey(instruction, agentProfile)).to.equal(true);
    expect(includesKey(instruction, vaultAuthority)).to.equal(true);
    expect(includesKey(instruction, vault)).to.equal(true);
  });

  it("builds agent payment instructions with receipt and merchant accounts", async () => {
    const owner = anchor.web3.Keypair.generate().publicKey;
    const agentAuthority = anchor.web3.Keypair.generate().publicKey;
    const agentProfile = deriveAgentProfile(
      owner,
      agentAuthority,
      program.programId
    )[0];
    const mint = anchor.web3.Keypair.generate().publicKey;
    const merchant = anchor.web3.Keypair.generate().publicKey;
    const merchantTokenAccount = anchor.web3.Keypair.generate().publicKey;
    const requestHash = normalizeRequestHash(new Uint8Array(32).fill(7));
    const [receipt] = deriveReceipt(
      agentProfile,
      requestHash,
      program.programId
    );
    const [merchantPolicy] = deriveMerchantPolicy(
      agentProfile,
      merchant,
      program.programId
    );
    const [vault] = deriveVault(agentProfile, program.programId);
    const [vaultAuthority] = deriveVaultAuthority(
      agentProfile,
      program.programId
    );

    const instruction = await buildAgentPayInstruction({
      program,
      agentAuthority,
      agentProfile,
      mint,
      merchant,
      merchantTokenAccount,
      amount: "10000",
      requestHash,
    });
    const transaction = createTransaction(instruction);

    expect(transaction.instructions).to.have.length(1);
    expect(instruction.programId.equals(program.programId)).to.equal(true);
    expect(includesKey(instruction, receipt)).to.equal(true);
    expect(includesKey(instruction, merchantPolicy)).to.equal(true);
    expect(includesKey(instruction, vault)).to.equal(true);
    expect(includesKey(instruction, vaultAuthority)).to.equal(true);
  });

  it("rejects request hashes that are not 32 bytes", () => {
    expect(() => normalizeRequestHash(new Uint8Array(31))).to.throw(
      "requestHash must be 32 bytes"
    );
  });

  it("builds raw pause instructions for Solana Actions", () => {
    const owner = anchor.web3.Keypair.generate().publicKey;
    const agentProfile = anchor.web3.Keypair.generate().publicKey;

    const instruction = buildSetPauseRawInstruction({
      owner,
      agentProfile,
      paused: true,
      programId: program.programId,
    });

    expect(instruction.programId.equals(program.programId)).to.equal(true);
    expect(instruction.keys[0].pubkey.equals(owner)).to.equal(true);
    expect(instruction.keys[0].isSigner).to.equal(true);
    expect(instruction.keys[0].isWritable).to.equal(false);
    expect(instruction.keys[1].pubkey.equals(agentProfile)).to.equal(true);
    expect(instruction.keys[1].isSigner).to.equal(false);
    expect(instruction.keys[1].isWritable).to.equal(true);
    expect(Buffer.from(instruction.data).toString("hex")).to.equal(
      "3f209a0238674f2d01"
    );
  });
});
