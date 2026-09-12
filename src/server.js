import express from "express";
import QRCode from "qrcode";
import { config } from "./config.js";
import { balance } from "./balance.js";
import { store } from "./store.js";
import { sendDrip } from "./faucet.js";

const app = express();
app.set("trust proxy", config.trustProxy === "true" ? true : config.trustProxy);
app.use(express.json({ limit: "8kb" }));

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """);
}

app.get("/", async (_req, res) => {
  const b = balance.get();
  const snap = store.snapshot();
  let qr = "";
  try {
    qr = await QRCode.toDataURL(config.faucetAddress, { width: 192, margin: 1 });
  } catch {
    qr = "";
  }
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>WART Faucet</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 40rem; margin: 2.5rem auto; padding: 0 1.2rem; background: #0b0d12; color: #e8eaef; }
  h1 { font-size: 1.45rem; margin: 0 0 .4rem; }
  .muted { color: #8b93a3; margin: 0 0 1.2rem; }
  section { background: #141821; border: 1px solid #2a3142; border-radius: .75rem; padding: 1.15rem; margin: 1rem 0; }
  label { display: block; font-size: .85rem; color: #b8bfcc; margin: 0 0 .35rem; }
  input, button { font: inherit; padding: .55rem .7rem; border-radius: .45rem; border: 1px solid #2a3142; background: #0b0d12; color: #e8eaef; }
  input { width: 100%; box-sizing: border-box; }
  button { cursor: pointer; background: #f5c518; color: #111; border-color: #f5c518; font-weight: 700; margin-top: .7rem; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  .addr { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .82rem; word-break: break-all; background: #0b0d12; padding: .55rem .7rem; border-radius: .45rem; border: 1px solid #2a3142; }
  .row { display: flex; gap: .75rem; align-items: flex-start; flex-wrap: wrap; }
  img.qr { width: 160px; height: 160px; background: #fff; padding: 6px; border-radius: .4rem; }
  pre { white-space: pre-wrap; background: #0b0d12; padding: .7rem; border-radius: .45rem; border: 1px solid #2a3142; font-size: .82rem; }
  .ok { color: #6ee787; }
  .err { color: #ff7b7b; }
  a { color: #f5c518; }
</style>
</head>
<body>
  <h1>Warthog faucet</h1>
  <p class="muted">
    ${esc(config.dripAmount)} WART per wallet, once.
    Reserve ${esc(b.reserve ?? "—")} ·
    ${esc(snap.remainingThisWeek)} / ${esc(config.weeklyBudget)} left this week.
  </p>
  <section>
    <label for="addr">Your mainnet WART address</label>
    <input id="addr" autocomplete="off" spellcheck="false" placeholder="48-character hex address"/>
    <button id="go">Request ${esc(config.dripAmount)} WART</button>
    <pre id="out" hidden></pre>
  </section>
  <section>
    <div class="row">
      <div style="flex:1">
        <label>Donate to keep it alive</label>
        <div class="addr" id="faucet">${esc(config.faucetAddress)}</div>
        <p class="muted" style="margin:.6rem 0 0">
          <a href="${esc(config.explorerAddr(config.faucetAddress))}" target="_blank" rel="noreferrer">Open on wartscan.io</a>
          · <button id="copy" style="margin:0;padding:.3rem .55rem">Copy</button>
        </p>
      </div>
      ${qr ? `<img class="qr" alt="QR" src="${qr}"/>` : ""}
    </div>
  </section>
<script>
document.getElementById("copy").onclick = () => navigator.clipboard.writeText(document.getElementById("faucet").textContent.trim());
document.getElementById("go").onclick = async () => {
  const btn = document.getElementById("go");
  const out = document.getElementById("out");
  btn.disabled = true;
  out.hidden = false;
  out.className = "";
  out.textContent = "Sending…";
  try {
    const r = await fetch("/api/drip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: document.getElementById("addr").value.trim() }),
    });
    const b = await r.json();
    out.className = b.ok ? "ok" : "err";
    out.textContent = b.ok
      ? ("Sent " + b.amount + " WART" + (b.explorerUrl ? "\\n" + b.explorerUrl : ""))
      : ("Error: " + (b.error || r.status));
  } catch (e) {
    out.className = "err";
    out.textContent = e.message;
  } finally {
    btn.disabled = false;
  }
};
</script>
</body>
</html>`);
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

app.get("/api/status", (_req, res) => {
  const b = balance.get();
  res.json({
    faucetAddress: config.faucetAddress,
    network: config.network,
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
