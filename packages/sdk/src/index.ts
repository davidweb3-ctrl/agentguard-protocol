import { PublicKey } from "@solana/web3.js";

export const AGENTGUARD_PROGRAM_ID = new PublicKey(
  "3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838"
);

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

export function deriveReceipt(
  agentProfile: PublicKey,
  requestHash: Uint8Array,
  programId = AGENTGUARD_PROGRAM_ID
) {
  if (requestHash.length !== 32) {
    throw new Error("requestHash must be 32 bytes");
  }

  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), agentProfile.toBuffer(), requestHash],
    programId
  );
}
