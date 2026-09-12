import express from "express";
import QRCode from "qrcode";
import { config } from "./config.js";
import { balance } from "./balance.js";
import { store } from "./store.js";
import { sendDrip } from "./faucet.js";
import { renderPage } from "./page.js";

const app = express();
app.set("trust proxy", config.trustProxy === "true" ? true : config.trustProxy);
app.use(express.json({ limit: "8kb" }));

app.get("/", async (_req, res) => {
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
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

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

app.get("/api/status", (_req, res) => {
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
});

balance
  .start()
  .then((snap) => {
    if (snap?.error) console.error("balance poll:", snap.error);
    app.listen(config.port, "0.0.0.0", () => {
      console.log(`WART faucet ${config.faucetAddress} on :${config.port}`);
    });
  })
  .catch((err) => {
    console.error(err.message || err);
    app.listen(config.port, "0.0.0.0", () => {
      console.log(`WART faucet starting without a live node on :${config.port}`);
    });
  });
