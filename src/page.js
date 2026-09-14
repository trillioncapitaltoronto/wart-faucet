function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&#38;")
    .replace(/</g, "&#60;")
    .replace(/>/g, "&#62;")
    .replace(/"/g, "&#34;");
}

const WORDMARK = `<span class="tc-mark" aria-label="Trillion Capital Toronto Corporation"><span class="tc-name">TRILLIONCAPITAL</span><span class="tc-sub">TORONTO CORPORATION</span></span>`;

export function renderPage({ address, reserve, drip, weekLeft, weekMax, nodeOk, qr, claims = [] }) {
  const qrSrc = typeof qr === "string" && qr.startsWith("data:image/") ? qr : "";
  const logRows = (claims || []).length
    ? claims.map((c) => {
        const shortA = String(c.address || "");
        const shown = shortA.length > 16 ? shortA.slice(0, 10) + "\u2026" + shortA.slice(-6) : shortA;
        const tx = c.txHash || "";
        const txShown = tx.length > 10 ? tx.slice(0, 10) + "\u2026" : tx;
        const href = tx ? `https://wartscan.io/tx/${esc(tx)}` : "#";
        return `<tr><td class="mono">${esc(shown)}</td><td class="mono">${esc(c.amount)}</td><td class="muted">${esc(c.createdAt || "")}</td><td class="mono">${tx ? `<a href="${href}">${esc(txShown)}</a>` : "\u2014"}</td></tr>`;
      }).join("")
    : `<tr><td colspan="4" class="muted">No claims yet.</td></tr>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Community WART faucet</title>
<style>
  :root { color-scheme: dark; --bg:#07080d; --card:#0e1118; --line:#242a38; --gold:#f5c400; --text:#f4f5f7; --muted:#8b93a3; --ok:#3ddc84; --err:#ff6b6b; --tc:#6b6fd6; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--text); }
  header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.4rem; border-bottom:1px solid var(--line); }
  .brand { display:flex; align-items:center; gap:.85rem; font-weight:700; }
  .tc-mark { display:flex; flex-direction:column; line-height:1; }
  .tc-name { color:var(--tc); letter-spacing:.08em; font-size:.78rem; font-weight:800; }
  .tc-sub { color:var(--tc); letter-spacing:.22em; font-size:.42rem; font-weight:700; margin-top:.18rem; opacity:.9; }
  nav a { color:var(--gold); text-decoration:none; margin-left:1rem; font-size:.82rem; font-weight:600; }
  main { max-width:44rem; margin:0 auto; padding:2.2rem 1.2rem 4rem; }
  .kicker { color:var(--gold); font-size:.72rem; letter-spacing:.14em; font-weight:700; text-transform:uppercase; }
  h1 { font-size:clamp(1.8rem,4vw,2.6rem); line-height:1.1; margin:.35rem 0 .7rem; }
  .lede { color:var(--muted); font-size:1.02rem; line-height:1.55; margin:0 0 1.4rem; }
  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:.7rem; margin:0 0 1.3rem; }
  .stat { background:var(--card); border:1px solid var(--line); border-radius:.7rem; padding:.85rem .9rem; }
  .stat b { display:block; font-size:1.05rem; }
  .stat span { color:var(--muted); font-size:.75rem; }
  section { background:var(--card); border:1px solid var(--line); border-radius:1rem; padding:1.2rem; margin:0 0 1rem; }
  label { display:block; font-size:.8rem; color:var(--muted); margin:0 0 .4rem; font-weight:600; }
  input { width:100%; padding:.7rem .75rem; border-radius:.55rem; border:1px solid var(--line); background:#07080d; color:var(--text); font:inherit; }
  button.gold { margin-top:.85rem; width:100%; padding:.75rem; border:0; border-radius:999px; background:var(--gold); color:#111; font:inherit; font-weight:700; cursor:pointer; }
  button.gold:disabled { opacity:.55; cursor:not-allowed; }
  button.ghost { margin-top:.55rem; padding:.35rem .65rem; border-radius:.4rem; border:1px solid var(--line); background:transparent; color:var(--text); font:inherit; font-size:.8rem; cursor:pointer; }
  button.ghost.copied { color:var(--ok); border-color:var(--ok); }
  .addr { font-family:ui-monospace,Menlo,monospace; font-size:.8rem; word-break:break-all; background:#07080d; border:1px solid var(--line); border-radius:.55rem; padding:.7rem; }
  .row { display:flex; gap:1rem; align-items:flex-start; flex-wrap:wrap; }
  img.qr { width:148px; height:148px; background:#fff; padding:6px; border-radius:.45rem; }
  pre { white-space:pre-wrap; margin:.8rem 0 0; font-size:.82rem; }
  .ok { color:var(--ok); }
  .err { color:var(--err); }
  footer { color:var(--muted); font-size:.78rem; line-height:1.5; }
  table { width:100%; border-collapse:collapse; font-size:.82rem; }
  th, td { text-align:left; padding:.45rem 0; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; font-size:.72rem; text-transform:uppercase; }
  .mono { font-family:ui-monospace,Menlo,monospace; word-break:break-all; }
  table a, footer a { color:var(--gold); }
  .op-foot { display:flex; align-items:center; gap:.7rem; flex-wrap:wrap; margin-bottom:.55rem; }
  @media (max-width:640px) { .stats { grid-template-columns:1fr; } nav { display:none; } }
</style>
</head>
<body>
<header>
  <div class="brand">
    ${WORDMARK}
    <span>Community WART faucet</span>
  </div>
  <nav>
    <a href="https://warthog.network">warthog.network</a>
    <a href="https://docs.warthog.network">docs</a>
    <a href="https://wartscan.io">explorer</a>
  </nav>
</header>
<main>
  <p class="kicker">Mainnet \u00b7 community pot \u00b7 not official</p>
  <h1>Starter WART so you can use the chain.</h1>
  <p class="lede">One drip per wallet. Donate or mine to the pot. Not operated by Warthog Network.</p>
  <div class="stats">
    <div class="stat"><b>${esc(drip)} WART</b><span>per wallet, once</span></div>
    <div class="stat"><b>${esc(reserve ?? "waiting on node")}</b><span>reserve</span></div>
    <div class="stat"><b>${esc(weekLeft)} / ${esc(weekMax)}</b><span>${nodeOk ? "node live" : "node unreachable"} \u00b7 week budget</span></div>
  </div>
  <section>
    <label for="addr">Your mainnet address</label>
    <input id="addr" autocomplete="off" spellcheck="false" placeholder="48-character hex"/>
    <button class="gold" id="go">Request ${esc(drip)} WART</button>
    <pre id="out" hidden></pre>
  </section>
  <section>
    <div class="row">
      <div style="flex:1">
        <label>Fund the pot \u2014 donate or mine</label>
        <div class="addr" id="faucet">${esc(address)}</div>
        <button class="ghost" id="copy" type="button">Copy address</button>
        <button class="ghost" id="copyMiner" type="button">Copy miner flag</button>
      </div>
      ${qrSrc ? `<img class="qr" alt="QR" src="${qrSrc}"/>` : ""}
    </div>
  </section>
  <section>
    <label>Public log</label>
    <table id="log"><thead><tr><th>Address</th><th>Amount</th><th>When</th><th>Tx</th></tr></thead><tbody id="log-body">${logRows}</tbody></table>
  </section>
  <footer>
    <div class="op-foot">
      ${WORDMARK}
      <span>Operated by Trillion Capital Toronto Corporation. Not an official Warthog Network service.</span>
    </div>
    Official project: <a href="https://warthog.network">warthog.network</a>
    \u00b7 Code <a href="https://github.com/trillioncapitaltoronto/wart-faucet">github</a>
  </footer>
</main>
<script>
function flashCopied(btn) {
  const label = btn.dataset.label || btn.textContent;
  btn.dataset.label = label;
  btn.textContent = "Copied!";
  btn.classList.add("copied");
  clearTimeout(btn._copiedTimer);
  btn._copiedTimer = setTimeout(() => {
    btn.textContent = label;
    btn.classList.remove("copied");
  }, 1600);
}
function copyText(btn, text) {
  const done = () => flashCopied(btn);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => {
      btn.textContent = "Copy failed";
    });
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); done(); } catch (e) { btn.textContent = "Copy failed"; }
  ta.remove();
}
const addr = () => document.getElementById("faucet").textContent.trim();
document.getElementById("copy").onclick = (e) => copyText(e.currentTarget, addr());
document.getElementById("copyMiner").onclick = (e) => copyText(e.currentTarget, "-a " + addr());
document.getElementById("go").onclick = async () => {
  const btn = document.getElementById("go");
  const out = document.getElementById("out");
  btn.disabled = true; out.hidden = false; out.className = ""; out.textContent = "Sending\u2026";
  try {
    const r = await fetch("/api/drip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: document.getElementById("addr").value.trim() }) });
    const b = await r.json();
    out.className = b.ok ? "ok" : "err";
    out.textContent = b.ok ? ("Sent " + b.amount + " WART" + (b.explorerUrl ? "\\n" + b.explorerUrl : "")) : ("Error: " + (b.error || r.status));
  } catch (e) { out.className = "err"; out.textContent = e.message; }
  finally { btn.disabled = false; }
};
</script>
</body>
</html>`;
}
