const demoSteps = [
  "Create an agent policy vault",
  "Fund the vault with test USDC",
  "Allowlist a paid API merchant",
  "Let the agent pay through policy checks",
  "Reject an over-limit request",
];

export default function Home() {
  return (
    <main style={{ margin: "0 auto", maxWidth: 960, padding: 32 }}>
      <h1>AgentGuard Protocol</h1>
      <p>
        Programmable spending limits for autonomous agents on Solana. This
        dashboard will manage policy vaults, merchant allowlists, spend limits,
        and receipt history.
      </p>
      <section>
        <h2>Hackathon Demo Flow</h2>
        <ol>
          {demoSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
