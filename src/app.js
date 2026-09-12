import express from "express";
import QRCode from "qrcode";
import { getConfig, hasFaucetKey } from "./config.js";
import { balance } from "./balance.js";
import { store } from "./store.js";
import { sendDrip } from "./faucet.js";
import { renderPage } from "./page.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", (process.env.TRUST_PROXY || "true") === "true");
app.use(express.json({ limit: "8kb" }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, configured: hasFaucetKey() });
});

app.get("/", async (_req, res) => {
  try {
    const config = getConfig();
    await balance.start();
    const b = balance.get();
    const snap = store.snapshot();
    let qr = "";
    try {
      qr = await QRCode.toDataURL(config.faucetAddress, { width: 192, margin: 1 });
    } catch {
      qr = "";
    }
    res.type("html").send(
      renderPage({
        address: config.faucetAddress,
        reserve: b.reserve,
        drip: config.dripAmount,
        weekLeft: snap.remainingThisWeek,
        weekMax: config.weeklyBudget,
        nodeOk: !b.error,
        qr,
      }),
    );
  } catch (err) {
    res.status(503).type("text").send(`Faucet is not configured: ${err.message}`);
  }
});

app.post("/api/drip", async (req, res) => {
  try {
    const result = await sendDrip({
      address: req.body?.address,
      ip: req.ip || "unknown",
    });
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.get("/api/status", async (_req, res) => {
  try {
    const config = getConfig();
    await balance.start();
    const b = balance.get();
    res.json({
      official: false,
      network: config.network,
      faucetAddress: config.faucetAddress,
      reserve: b.reserve,
      node: b.node,
      dripAmount: config.dripAmount,
      weeklyBudget: config.weeklyBudget,
      ...store.snapshot(),
      health: { up: true, nodeReachable: !b.error, error: b.error },
    });
  } catch (err) {
    res.status(503).json({ official: false, ok: false, error: String(err.message || err) });
  }
});
