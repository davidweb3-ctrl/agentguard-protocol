import express from "express";

const app = express();
const port = Number(process.env.DEMO_API_PORT ?? 8787);

app.use(express.json());

app.get("/paid/weather-alpha", (req, res) => {
  const receipt = req.header("x-agentguard-receipt");

  if (!receipt) {
    res.status(402).json({
      error: "payment_required",
      amount: "10000",
      token: "devnet-usdc",
      merchant: "replace-with-merchant-wallet",
      requestHash: "replace-with-32-byte-request-hash",
      instructions:
        "Pay with AgentGuard agent_pay, then retry with x-agentguard-receipt.",
    });
    return;
  }

  res.json({
    ok: true,
    receipt,
    data: {
      signal: "paid API response unlocked by AgentGuard receipt",
    },
  });
});

app.listen(port, () => {
  console.log(`AgentGuard x402 demo API listening on ${port}`);
});
