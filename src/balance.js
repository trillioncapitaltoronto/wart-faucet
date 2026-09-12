import { getConfig } from "./config.js";

const TIMEOUT_MS = 6000;

let last = { reserve: null, node: null, checkedAt: 0, error: "not polled" };
let timer = null;

async function fetchBalance(nodeUrl) {
  const url = `${nodeUrl}/account/${getConfig().faucetAddress}/wart_balance`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${nodeUrl}`);
  const body = await res.json();
  const totalStr = body?.data?.wart?.total?.str;
  if (typeof totalStr !== "string") throw new Error(`bad balance shape from ${nodeUrl}`);
  return totalStr;
}

async function firstHealthyNode() {
  let lastErr = "no nodes";
  for (const node of getConfig().nodes) {
    try {
      const reserve = await fetchBalance(node);
      return { node, reserve };
    } catch (err) {
      lastErr = String(err?.message || err);
    }
  }
  throw new Error(lastErr);
}

async function poll() {
  try {
    const { node, reserve } = await firstHealthyNode();
    last = { reserve, node, checkedAt: Date.now(), error: null };
  } catch (err) {
    last = { ...last, error: String(err?.message || err), checkedAt: Date.now() };
  }
  return last;
}

export const balance = {
  get: () => last,
  poll,
  async getFresh() {
    if (!last.reserve || Date.now() - last.checkedAt > 90_000) await poll();
    return last;
  },
  async start() {
    await poll();
    if (!timer) timer = setInterval(poll, 60_000);
    if (typeof timer.unref === "function") timer.unref();
    return last;
  },
};

export async function pickNode() {
  const snap = await balance.getFresh();
  if (snap.node && !snap.error) return snap.node;
  const { node } = await firstHealthyNode();
  return node;
}
