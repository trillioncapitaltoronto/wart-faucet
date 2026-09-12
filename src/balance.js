import { config } from "./config.js";

const TIMEOUT_MS = 15_000;

let last = { reserve: null, node: null, checkedAt: 0, error: "not polled" };
let timer = null;

function nodeBase() {
  return config.nodeUrl.replace(/\/$/, "");
}

async function poll() {
  const url = `${nodeBase()}/account/${config.faucetAddress}/wart_balance`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body?.code !== 0) throw new Error(`node code ${body?.code}`);
    const totalStr = body?.data?.wart?.total?.str;
    if (typeof totalStr !== "string" || !/^\d+(\.\d{1,8})?$/.test(totalStr)) {
      throw new Error("unexpected balance shape");
    }
    last = { reserve: totalStr, node: nodeBase(), checkedAt: Date.now(), error: null };
  } catch (err) {
    last = { ...last, error: String(err?.message || err), checkedAt: Date.now() };
  }
  return last;
}

function stale(snap) {
  if (!snap.reserve) return true;
  return Date.now() - snap.checkedAt > config.balancePollMs * 2;
}

export const balance = {
  get: () => last,
  poll,
  async getFresh() {
    if (stale(last)) await poll();
    return last;
  },
  async start() {
    // Bind HTTP first on Render. A slow/down node must not crash the process.
    if (!timer) {
      timer = setInterval(poll, config.balancePollMs);
      if (typeof timer.unref === "function") timer.unref();
    }
    const first = await poll();
    if (first.error) {
      console.error(`balance poll failed (will retry): ${first.error} (NODE_URL=${config.nodeUrl})`);
    }
    return last;
  },
};
