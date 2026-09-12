import express from "express";
import cors from "cors";
import QRCode from "qrcode";
import { config } from "./config.js";
import { balance } from "./balance.js";
import { store } from "./store.js";
import { sendDrip } from "./faucet.js";
import { renderPage } from "./page.js";

export const app = express();
app.disable("x-powered-by");

const trust = config.trustProxy;
app.set("trust proxy", trust === "true" ? true : trust === "false" ? false : trust);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      cb(null, config.corsOrigins.includes(origin));
    },
  }),
);
app.use(express.json({ limit: "8kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
  next();
});

app.get("/healthz", (_req, res) => {
  const b = balance.get();
  res.json({ ok: !b.error, nodeReachable: !b.error });
});

app.get("/", async (_req, res) => {
  try {
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
        weekMax: String(config.weeklyBudget),
        nodeOk: !b.error,
        qr,
        claims: store.recent(20),
      }),
    );
  } catch (err) {
    console.error(err);
    res.status(503).type("text").send("Faucet is not ready");
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

app.get("/api/log", (req, res) => {
  const limit = req.query?.limit;
  const claims = store.recent(limit);
  res.json({
    platform: "web",
    count: claims.length,
    claims: claims.map((c) => ({
      address: c.address,
      amount_wart: c.amount,
      created_at: c.createdAt,
      tx_hash: c.txHash,
      explorerUrl: c.txHash ? config.explorerTx(c.txHash) : null,
    })),
  });
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
    minReserve: config.minReserve,
    lastBalanceCheckAt: b.checkedAt ? new Date(b.checkedAt).toISOString() : null,
    ...store.snapshot(),
    health: {
      up: true,
      uptimeSec: Math.floor(process.uptime()),
      nodeReachable: !b.error,
      error: b.error,
    },
  });
});
