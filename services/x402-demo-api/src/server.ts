import express from "express";

import {
  buildPaymentChallenge,
  loadDemoConfig,
  parseProofHeader,
  validatePaymentProof,
} from "./protocol.js";

const app = express();
const port = Number(process.env.DEMO_API_PORT ?? 8787);

app.use(express.json());

app.get("/paid/weather-alpha", async (req, res) => {
  const config = loadDemoConfig();
  const challenge = buildPaymentChallenge(config);
  const proof = parseProofHeader(req.header("x-agentguard-proof"));

  if (!proof) {
    res.status(402).json(challenge);
    return;
  }

  if (
    !(await validatePaymentProof(proof, challenge, {
      rpcUrl: config.rpcUrl,
      verifyOnchainReceipt: config.verifyOnchainReceipt,
    }))
  ) {
    res.status(402).json({
      ...challenge,
      errorDetail: "Invalid AgentGuard proof.",
    });
    return;
  }

  res.json({
    ok: true,
    proof,
    data: {
      signal: "paid API response unlocked by AgentGuard receipt",
      source: "weather-alpha",
    },
  });
});

app.listen(port, () => {
  console.log(`AgentGuard x402 demo API listening on ${port}`);
});
