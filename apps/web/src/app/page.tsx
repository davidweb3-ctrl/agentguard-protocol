const policyChecks = [
  { label: "Agent authority", status: "Enforced" },
  { label: "Merchant allowlist", status: "Enforced" },
  { label: "Per-transaction limit", status: "Enforced" },
  { label: "Daily limit", status: "Enforced" },
  { label: "Merchant cap", status: "Enforced" },
  { label: "Paused status", status: "Enforced" },
];

const demoFlow = [
  "API returns 402 challenge",
  "Agent submits agent_pay",
  "Program checks policy before transfer",
  "Receipt PDA is created",
  "Agent retries with proof",
  "Over-limit request is rejected",
];

const proofFields = [
  "agentProfile",
  "requestHash",
  "receiptPda",
  "txSignature",
];

export default function Home() {
  return (
    <main style={styles.page}>
      <style>{responsiveStyles}</style>
      <section data-layout="hero" style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Solana-native agent spending firewall</p>
          <h1 data-layout="title" style={styles.title}>
            AgentGuard Protocol
          </h1>
          <p style={styles.subtitle}>
            Programmable spending limits for autonomous agents on Solana.
          </p>
        </div>
        <div style={styles.statusPanel}>
          <p style={styles.panelLabel}>Demo status</p>
          <strong style={styles.panelValue}>Policy vault ready</strong>
          <span style={styles.panelHint}>
            Seed localnet, run the x402 demo API, then let the agent pay inside
            owner-defined limits.
          </span>
        </div>
      </section>

      <section data-layout="grid" style={styles.grid}>
        <article style={styles.primaryPanel}>
          <div style={styles.panelHeader}>
            <div>
              <p style={styles.panelLabel}>Owner policy</p>
              <h2 style={styles.sectionTitle}>Agent budget controls</h2>
            </div>
            <span style={styles.badge}>Active</span>
          </div>
          <div data-layout="metrics" style={styles.metricsGrid}>
            <Metric label="Per transaction" value="10,000" />
            <Metric label="Daily budget" value="30,000" />
            <Metric label="Merchant cap" value="10,000" />
            <Metric label="Vault token" value="test USDC" />
          </div>
          <div style={styles.controlRow}>
            <button style={styles.primaryButton}>Pause agent</button>
            <button style={styles.secondaryButton}>Update limits</button>
            <button style={styles.secondaryButton}>Add merchant</button>
          </div>
        </article>

        <article style={styles.sidePanel}>
          <p style={styles.panelLabel}>Merchant allowlist</p>
          <h2 style={styles.sectionTitle}>Paid API merchant</h2>
          <div style={styles.identityBlock}>
            <span style={styles.identityLabel}>Merchant</span>
            <code style={styles.codeValue}>Configured by .env.demo</code>
          </div>
          <div style={styles.identityBlock}>
            <span style={styles.identityLabel}>Token account</span>
            <code style={styles.codeValue}>Seeded local SPL account</code>
          </div>
        </article>
      </section>

      <section data-layout="grid" style={styles.grid}>
        <article style={styles.panel}>
          <p style={styles.panelLabel}>Policy checks</p>
          <h2 style={styles.sectionTitle}>Transfer gate</h2>
          <div style={styles.checkList}>
            {policyChecks.map((check) => (
              <div key={check.label} style={styles.checkItem}>
                <span>{check.label}</span>
                <strong>{check.status}</strong>
              </div>
            ))}
          </div>
        </article>

        <article style={styles.panel}>
          <p style={styles.panelLabel}>Receipt proof</p>
          <h2 style={styles.sectionTitle}>x402 retry payload</h2>
          <div data-layout="proof" style={styles.proofGrid}>
            {proofFields.map((field) => (
              <code key={field} style={styles.proofField}>
                {field}
              </code>
            ))}
          </div>
          <p style={styles.bodyText}>
            The demo API unlocks paid data only after the agent returns a proof
            matching the request hash and receipt PDA.
          </p>
        </article>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <p style={styles.panelLabel}>Hackathon demo loop</p>
            <h2 style={styles.sectionTitle}>402 challenge to paid data</h2>
          </div>
          <code data-layout="command" style={styles.command}>
            pnpm --filter @agentguard/x402-demo-api agent
          </code>
        </div>
        <div data-layout="flow" style={styles.flowGrid}>
          {demoFlow.map((step, index) => (
            <div key={step} style={styles.flowStep}>
              <span style={styles.stepNumber}>{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "40px",
    background: "#f7f8fa",
    color: "#171923",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 360px",
    gap: 24,
    alignItems: "stretch",
    maxWidth: 1180,
    margin: "0 auto 24px",
  },
  eyebrow: {
    margin: "0 0 12px",
    color: "#4b5563",
    fontSize: 14,
    fontWeight: 700,
    textTransform: "uppercase" as const,
  },
  title: {
    margin: 0,
    fontSize: 56,
    lineHeight: 1,
    letterSpacing: 0,
  },
  subtitle: {
    maxWidth: 640,
    margin: "18px 0 0",
    color: "#4b5563",
    fontSize: 20,
    lineHeight: 1.55,
  },
  statusPanel: {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    border: "1px solid #d9dee8",
    borderRadius: 8,
    background: "#ffffff",
    padding: 24,
    minHeight: 180,
  },
  panel: {
    maxWidth: 1180,
    margin: "0 auto 24px",
    border: "1px solid #d9dee8",
    borderRadius: 8,
    background: "#ffffff",
    padding: 24,
  },
  primaryPanel: {
    border: "1px solid #d9dee8",
    borderRadius: 8,
    background: "#ffffff",
    padding: 24,
  },
  sidePanel: {
    border: "1px solid #d9dee8",
    borderRadius: 8,
    background: "#101827",
    color: "#ffffff",
    padding: 24,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
    gap: 24,
    maxWidth: 1180,
    margin: "0 auto 24px",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 22,
  },
  panelLabel: {
    margin: "0 0 8px",
    color: "#687081",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase" as const,
  },
  panelValue: {
    display: "block",
    fontSize: 28,
    lineHeight: 1.15,
  },
  panelHint: {
    display: "block",
    color: "#5d6678",
    fontSize: 14,
    lineHeight: 1.5,
    marginTop: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.2,
  },
  badge: {
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 700,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  metric: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 16,
    background: "#fbfcfe",
  },
  metricLabel: {
    display: "block",
    color: "#687081",
    fontSize: 13,
    marginBottom: 8,
  },
  metricValue: {
    display: "block",
    fontSize: 22,
    lineHeight: 1.2,
  },
  controlRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    marginTop: 22,
  },
  primaryButton: {
    border: 0,
    borderRadius: 8,
    background: "#1f6feb",
    color: "#ffffff",
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
  },
  secondaryButton: {
    border: "1px solid #cfd6e4",
    borderRadius: 8,
    background: "#ffffff",
    color: "#1f2937",
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
  },
  identityBlock: {
    borderTop: "1px solid rgba(255,255,255,0.16)",
    paddingTop: 16,
    marginTop: 16,
  },
  identityLabel: {
    display: "block",
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 8,
  },
  codeValue: {
    display: "block",
    color: "#dbeafe",
    fontSize: 14,
    wordBreak: "break-word" as const,
  },
  checkList: {
    display: "grid",
    gap: 10,
  },
  checkItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "12px 14px",
    background: "#fbfcfe",
  },
  proofGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 18,
  },
  proofField: {
    border: "1px solid #dbe4f0",
    borderRadius: 8,
    padding: "12px",
    background: "#f8fafc",
    fontSize: 14,
  },
  bodyText: {
    margin: 0,
    color: "#4b5563",
    lineHeight: 1.55,
  },
  command: {
    border: "1px solid #dbe4f0",
    borderRadius: 8,
    padding: "10px 12px",
    background: "#f8fafc",
    color: "#334155",
    fontSize: 13,
  },
  flowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 12,
  },
  flowStep: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 14,
    minHeight: 92,
    background: "#fbfcfe",
  },
  stepNumber: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 999,
    marginBottom: 12,
    background: "#1f6feb",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 800,
  },
} satisfies Record<string, React.CSSProperties>;

const responsiveStyles = `
  @media (max-width: 900px) {
    main {
      padding: 24px !important;
    }

    [data-layout="hero"],
    [data-layout="grid"],
    [data-layout="metrics"],
    [data-layout="flow"] {
      grid-template-columns: 1fr !important;
    }

    [data-layout="title"] {
      font-size: 40px !important;
    }

    [data-layout="command"] {
      width: 100% !important;
      box-sizing: border-box !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }
  }

  @media (max-width: 520px) {
    main {
      padding: 18px !important;
    }

    [data-layout="title"] {
      font-size: 34px !important;
    }

    [data-layout="proof"] {
      grid-template-columns: 1fr !important;
    }
  }
`;
