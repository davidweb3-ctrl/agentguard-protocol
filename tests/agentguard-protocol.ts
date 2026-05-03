import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";

describe("agentguard-protocol", () => {
  const programId = new anchor.web3.PublicKey(
    "3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838"
  );

  it("derives the agent profile PDA", async () => {
    const owner = anchor.web3.Keypair.generate().publicKey;
    const agentAuthority = anchor.web3.Keypair.generate().publicKey;
    const [agentProfile] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), owner.toBuffer(), agentAuthority.toBuffer()],
      programId
    );

    expect(agentProfile.toBase58()).to.be.a("string");
  });
});
