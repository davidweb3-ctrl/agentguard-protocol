import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

import { AgentguardProtocol } from "../target/types/agentguard_protocol";

const INITIAL_OWNER_TOKENS = 1_000_000;
const DEFAULT_DEPOSIT = 100_000;
const DEFAULT_PER_TX_LIMIT = 10_000;
const DEFAULT_DAILY_LIMIT = 30_000;
const DEFAULT_MERCHANT_CAP = 10_000;

describe("agentguard-protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .AgentguardProtocol as Program<AgentguardProtocol>;

  function deriveAgentProfile(
    owner: anchor.web3.PublicKey,
    agentAuthority: anchor.web3.PublicKey
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), owner.toBuffer(), agentAuthority.toBuffer()],
      program.programId
    );
  }

  function deriveVaultAuthority(agentProfile: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), agentProfile.toBuffer()],
      program.programId
    );
  }

  function deriveVault(agentProfile: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), agentProfile.toBuffer()],
      program.programId
    );
  }

  function deriveMerchantPolicy(
    agentProfile: anchor.web3.PublicKey,
    merchant: anchor.web3.PublicKey
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), agentProfile.toBuffer(), merchant.toBuffer()],
      program.programId
    );
  }

  function deriveReceipt(
    agentProfile: anchor.web3.PublicKey,
    requestHash: Uint8Array
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("receipt"), agentProfile.toBuffer(), requestHash],
      program.programId
    );
  }

  function requestHash(seed: number) {
    const hash = Buffer.alloc(32);
    hash.writeUInt32LE(seed, 0);
    return Array.from(hash);
  }

  async function airdrop(keypair: anchor.web3.Keypair) {
    const signature = await provider.connection.requestAirdrop(
      keypair.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    const blockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      {
        signature,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      },
      "confirmed"
    );
  }

  async function tokenBalance(address: anchor.web3.PublicKey) {
    const account = await getAccount(provider.connection, address);
    return Number(account.amount);
  }

  async function expectRejectedWithoutTransfer(
    action: () => Promise<unknown>,
    fixture: TestFixture
  ) {
    const vaultBefore = await tokenBalance(fixture.vault);
    const merchantBefore = await tokenBalance(fixture.merchantTokenAccount);

    try {
      await action();
      expect.fail("Expected transaction to be rejected");
    } catch (_error) {
      expect(await tokenBalance(fixture.vault)).to.equal(vaultBefore);
      expect(await tokenBalance(fixture.merchantTokenAccount)).to.equal(
        merchantBefore
      );
    }
  }

  type TestFixture = Awaited<ReturnType<typeof setupAgent>>;

  async function setupAgent(options?: {
    perTxLimit?: number;
    dailyLimit?: number;
    merchantCap?: number;
    depositAmount?: number;
  }) {
    const owner = anchor.web3.Keypair.generate();
    const agentAuthority = anchor.web3.Keypair.generate();
    const merchant = anchor.web3.Keypair.generate();

    await Promise.all([airdrop(owner), airdrop(agentAuthority)]);

    const mint = await createMint(
      provider.connection,
      owner,
      owner.publicKey,
      null,
      6
    );
    const ownerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      owner,
      mint,
      owner.publicKey
    );
    const merchantTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      owner,
      mint,
      merchant.publicKey
    );

    await mintTo(
      provider.connection,
      owner,
      mint,
      ownerTokenAccount,
      owner,
      INITIAL_OWNER_TOKENS
    );

    const [agentProfile] = deriveAgentProfile(
      owner.publicKey,
      agentAuthority.publicKey
    );
    const [vaultAuthority] = deriveVaultAuthority(agentProfile);
    const [vault] = deriveVault(agentProfile);
    const [merchantPolicy] = deriveMerchantPolicy(
      agentProfile,
      merchant.publicKey
    );

    const perTxLimit = options?.perTxLimit ?? DEFAULT_PER_TX_LIMIT;
    const dailyLimit = options?.dailyLimit ?? DEFAULT_DAILY_LIMIT;
    const merchantCap = options?.merchantCap ?? DEFAULT_MERCHANT_CAP;
    const depositAmount = options?.depositAmount ?? DEFAULT_DEPOSIT;

    await program.methods
      .initializeAgent(
        agentAuthority.publicKey,
        new anchor.BN(perTxLimit),
        new anchor.BN(dailyLimit)
      )
      .accounts({
        owner: owner.publicKey,
        mint,
        agentProfile,
        vaultAuthority,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([owner])
      .rpc();

    await program.methods
      .deposit(new anchor.BN(depositAmount))
      .accounts({
        owner: owner.publicKey,
        agentProfile,
        mint,
        ownerTokenAccount,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();

    await program.methods
      .addMerchant(merchant.publicKey, new anchor.BN(merchantCap))
      .accounts({
        owner: owner.publicKey,
        agentProfile,
        merchantPolicy,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    return {
      owner,
      agentAuthority,
      merchant,
      mint,
      ownerTokenAccount,
      merchantTokenAccount,
      agentProfile,
      vaultAuthority,
      vault,
      merchantPolicy,
      perTxLimit,
      dailyLimit,
      merchantCap,
      depositAmount,
    };
  }

  async function agentPay(
    fixture: TestFixture,
    amount: number,
    hashSeed: number,
    overrides?: Partial<{
      agentAuthority: anchor.web3.Keypair;
      mint: anchor.web3.PublicKey;
      vault: anchor.web3.PublicKey;
      merchantPolicy: anchor.web3.PublicKey;
      merchantTokenAccount: anchor.web3.PublicKey;
      receipt: anchor.web3.PublicKey;
    }>
  ) {
    const hash = requestHash(hashSeed);
    const authority = overrides?.agentAuthority ?? fixture.agentAuthority;
    const [receipt] = deriveReceipt(fixture.agentProfile, Buffer.from(hash));

    return program.methods
      .agentPay(new anchor.BN(amount), hash)
      .accounts({
        agentAuthority: authority.publicKey,
        agentProfile: fixture.agentProfile,
        mint: overrides?.mint ?? fixture.mint,
        vaultAuthority: fixture.vaultAuthority,
        vault: overrides?.vault ?? fixture.vault,
        merchantPolicy: overrides?.merchantPolicy ?? fixture.merchantPolicy,
        merchantTokenAccount:
          overrides?.merchantTokenAccount ?? fixture.merchantTokenAccount,
        receipt: overrides?.receipt ?? receipt,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([authority])
      .rpc();
  }

  it("derives the agent profile PDA", async () => {
    const owner = anchor.web3.Keypair.generate().publicKey;
    const agentAuthority = anchor.web3.Keypair.generate().publicKey;
    const [agentProfile] = deriveAgentProfile(owner, agentAuthority);

    expect(agentProfile.toBase58()).to.be.a("string");
  });

  it("transfers to an allowlisted merchant and writes a receipt", async () => {
    const fixture = await setupAgent();
    const amount = 7_500;
    const hash = requestHash(1);
    const [receipt] = deriveReceipt(fixture.agentProfile, Buffer.from(hash));

    await agentPay(fixture, amount, 1);

    expect(await tokenBalance(fixture.vault)).to.equal(
      fixture.depositAmount - amount
    );
    expect(await tokenBalance(fixture.merchantTokenAccount)).to.equal(amount);

    const receiptAccount = await program.account.paymentReceipt.fetch(receipt);
    expect(receiptAccount.agentProfile.equals(fixture.agentProfile)).to.equal(
      true
    );
    expect(
      receiptAccount.agentAuthority.equals(fixture.agentAuthority.publicKey)
    ).to.equal(true);
    expect(receiptAccount.merchant.equals(fixture.merchant.publicKey)).to.equal(
      true
    );
    expect(receiptAccount.amount.toNumber()).to.equal(amount);
    expect(Buffer.from(receiptAccount.requestHash)).to.deep.equal(
      Buffer.from(hash)
    );
  });

  it("rejects an unauthorized agent before transfer", async () => {
    const fixture = await setupAgent();
    const wrongAgent = anchor.web3.Keypair.generate();
    await airdrop(wrongAgent);

    await expectRejectedWithoutTransfer(
      () => agentPay(fixture, 1_000, 2, { agentAuthority: wrongAgent }),
      fixture
    );
  });

  it("rejects an unknown merchant before transfer", async () => {
    const fixture = await setupAgent();
    const unknownMerchant = anchor.web3.Keypair.generate();
    const [unknownMerchantPolicy] = deriveMerchantPolicy(
      fixture.agentProfile,
      unknownMerchant.publicKey
    );
    const unknownMerchantTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      fixture.owner,
      fixture.mint,
      unknownMerchant.publicKey
    );

    await expectRejectedWithoutTransfer(
      () =>
        agentPay(fixture, 1_000, 3, {
          merchantPolicy: unknownMerchantPolicy,
          merchantTokenAccount: unknownMerchantTokenAccount,
        }),
      fixture
    );
  });

  it("rejects a payment over the per-transaction limit before transfer", async () => {
    const fixture = await setupAgent({
      perTxLimit: 5_000,
      dailyLimit: 30_000,
      merchantCap: 30_000,
    });

    await expectRejectedWithoutTransfer(
      () => agentPay(fixture, 5_001, 4),
      fixture
    );
  });

  it("rejects a payment over the daily limit before transfer", async () => {
    const fixture = await setupAgent({
      perTxLimit: 10_000,
      dailyLimit: 12_000,
      merchantCap: 10_000,
    });

    await agentPay(fixture, 8_000, 5);

    await expectRejectedWithoutTransfer(
      () => agentPay(fixture, 5_000, 6),
      fixture
    );
  });

  it("rejects a payment over the merchant cap before transfer", async () => {
    const fixture = await setupAgent({
      perTxLimit: 10_000,
      dailyLimit: 30_000,
      merchantCap: 4_000,
    });

    await expectRejectedWithoutTransfer(
      () => agentPay(fixture, 4_001, 7),
      fixture
    );
  });

  it("rejects a paused agent before transfer", async () => {
    const fixture = await setupAgent();

    await program.methods
      .setPause(true)
      .accounts({
        owner: fixture.owner.publicKey,
        agentProfile: fixture.agentProfile,
      })
      .signers([fixture.owner])
      .rpc();

    await expectRejectedWithoutTransfer(
      () => agentPay(fixture, 1_000, 8),
      fixture
    );
  });

  it("rejects duplicate request hashes before a second transfer", async () => {
    const fixture = await setupAgent();

    await agentPay(fixture, 1_000, 9);

    await expectRejectedWithoutTransfer(
      () => agentPay(fixture, 1_000, 9),
      fixture
    );
  });

  it("rejects a wrong mint before transfer", async () => {
    const fixture = await setupAgent();
    const wrongMint = await createMint(
      provider.connection,
      fixture.owner,
      fixture.owner.publicKey,
      null,
      6
    );
    const wrongMintMerchantTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      fixture.owner,
      wrongMint,
      fixture.merchant.publicKey
    );

    await expectRejectedWithoutTransfer(
      () =>
        agentPay(fixture, 1_000, 10, {
          mint: wrongMint,
          merchantTokenAccount: wrongMintMerchantTokenAccount,
        }),
      fixture
    );
  });

  it("rejects a wrong vault before transfer", async () => {
    const fixture = await setupAgent();
    const wrongVault = await createAssociatedTokenAccount(
      provider.connection,
      fixture.owner,
      fixture.mint,
      fixture.vaultAuthority,
      undefined,
      TOKEN_PROGRAM_ID,
      undefined,
      true
    );

    await expectRejectedWithoutTransfer(
      () => agentPay(fixture, 1_000, 11, { vault: wrongVault }),
      fixture
    );
  });

  it("rejects a wrong merchant token owner before transfer", async () => {
    const fixture = await setupAgent();
    const wrongMerchant = anchor.web3.Keypair.generate();
    const wrongMerchantTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      fixture.owner,
      fixture.mint,
      wrongMerchant.publicKey
    );

    await expectRejectedWithoutTransfer(
      () =>
        agentPay(fixture, 1_000, 12, {
          merchantTokenAccount: wrongMerchantTokenAccount,
        }),
      fixture
    );
  });
});
