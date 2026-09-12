function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """);
}

export function renderPage({ address, reserve, drip, weekLeft, weekMax, nodeOk, qr }) {
  const reserveLabel = reserve ?? "waiting on node";
  const nodeLabel = nodeOk ? "node live" : "node unreachable";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Community WART faucet</title>
<meta name="description" content="Community mainnet Warthog faucet. Starter WART, donate, or mine to the pot. Not an official Warthog Network service."/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  :root {
    --bg: #07080d;
    --card: #0e1118;
    --line: #242a38;
    --gold: #f5c400;
    --text: #f4f5f7;
    --muted: #8b93a3;
    --ok: #3ddc84;
    --err: #ff6b6b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    background: radial-gradient(1200px 500px at 80% -10%, rgba(245,196,0,.08), transparent 50%), var(--bg);
    color: var(--text);
  }
  header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.4rem; border-bottom: 1px solid var(--line); }
  .brand { display: flex; align-items: center; gap: .7rem; font-weight: 700; }
  .dot { width: 28px; height: 28px; border-radius: 50%; background: var(--gold); color: #111; display: grid; place-items: center; }
  nav a { color: var(--gold); text-decoration: none; margin-left: 1rem; font-size: .82rem; font-weight: 600; }
  main { max-width: 44rem; margin: 0 auto; padding: 2.2rem 1.2rem 4rem; }
  .kicker { color: var(--gold); font-size: .72rem; letter-spacing: .14em; font-weight: 700; text-transform: uppercase; }
  h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); line-height: 1.1; margin: .35rem 0 .7rem; }
  .lede { color: var(--muted); font-size: 1.02rem; line-height: 1.55; margin: 0 0 1.4rem; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: .7rem; margin: 0 0 1.3rem; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: .7rem; padding: .85rem .9rem; }
  .stat b { display: block; font-size: 1.05rem; }
  .stat span { color: var(--muted); font-size: .75rem; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 1rem; padding: 1.2rem; margin: 0 0 1rem; }
  label { display: block; font-size: .8rem; color: var(--muted); margin: 0 0 .4rem; font-weight: 600; }
  input { width: 100%; padding: .7rem .75rem; border-radius: .55rem; border: 1px solid var(--line); background: #07080d; color: var(--text); font: inherit; }
  button.gold { margin-top: .85rem; width: 100%; padding: .75rem; border: 0; border-radius: 999px; background: var(--gold); color: #111; font: inherit; font-weight: 700; cursor: pointer; }
  button.gold:disabled { opacity: .55; cursor: not-allowed; }
  button.ghost { margin-top: .55rem; padding: .35rem .65rem; border-radius: .4rem; border: 1px solid var(--line); background: transparent; color: var(--text); font: inherit; font-size: .8rem; cursor: pointer; }
  .addr { font-family: ui-monospace, Menlo, monospace; font-size: .8rem; word-break: break-all; background: #07080d; border: 1px solid var(--line); border-radius: .55rem; padding: .7rem; }
  .row { display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
  img.qr { width: 148px; height: 148px; background: #fff; padding: 6px; border-radius: .45rem; }
  pre { white-space: pre-wrap; margin: .8rem 0 0; font-size: .82rem; }
  .ok { color: var(--ok); }
  .err { color: var(--err); }
  footer { color: var(--muted); font-size: .78rem; line-height: 1.5; }
  footer a { color: var(--gold); }
  @media (max-width: 640px) { .stats { grid-template-columns: 1fr; } nav { display: none; } }
</style>
</head>
<body>
<header>
  <div class="brand"><span class="dot">W</span> Community WART faucet</div>
  <nav>
    <a href="https://warthog.network">warthog.network</a>
    <a href="https://docs.warthog.network">docs</a>
    <a href="https://wartscan.io">explorer</a>
  </nav>
</header>
<main>
  <p class="kicker">Mainnet · community pot · not official</p>
  <h1>Starter WART so you can use the chain.</h1>
  <p class="lede">
    One drip per wallet. Donate or point a miner at the same address to keep the pot alive.
    Built with official <code>warthog-js</code> against public mainnet nodes.
    This is not operated by Warthog Network.
  </p>
  <div class="stats">
    <div class="stat"><b>${esc(drip)} WART</b><span>per wallet, once</span></div>
    <div class="stat"><b>${esc(reserveLabel)}</b><span>reserve</span></div>
    <div class="stat"><b>${esc(weekLeft)} / ${esc(weekMax)}</b><span>${esc(nodeLabel)} · week budget</span></div>
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
        <label>Donate or mine to this address</label>
        <div class="addr" id="faucet">${esc(address)}</div>
        <button class="ghost" id="copy">Copy</button>
        · <a href="https://wartscan.io/account/${esc(address)}" style="color:var(--gold);font-size:.85rem">wartscan.io</a>
        <p class="lede" style="margin:.8rem 0 0;font-size:.88rem">Miner payout field: paste that address. Janushash needs CPU + GPU.</p>
      </div>
      ${qr ? `<img class="qr" alt="QR" src="${qr}"/>` : ""}
    </div>
  </section>
  <footer>
    Community faucet. No accounts, no cards, no email.
    Official project: <a href="https://warthog.network">warthog.network</a>
    · Discord <a href="https://discord.gg/QMDV8bGTdQ">invite</a>
    · Code <a href="https://github.com/trillioncapitaltoronto/wart-faucet">github</a>
  </footer>
</main>
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
</html>`;
}
