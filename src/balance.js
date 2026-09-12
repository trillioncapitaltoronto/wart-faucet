import { config } from "./config.js";

const TIMEOUT_MS = 15_000;

let last = { reserve: null, node: null, checkedAt: 0, error: "not polled" };
let timer = null;

function nodeBase() {
  return config.nodeUrl.replace(/\/$/, "");
}

function asAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && /^\d+(\.\d{1,8})?$/.test(value.trim())) return value.trim();
  return null;
}

async function pollNode() {
  const url = `${nodeBase()}/account/${config.faucetAddress}/wart_balance`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`node HTTP ${res.status}`);
  const body = await res.json();
  if (body?.code !== 0) throw new Error(`node code ${body?.code}`);
  const totalStr = asAmount(body?.data?.wart?.total?.str);
  if (!totalStr) throw new Error("unexpected node balance shape");
  return { reserve: totalStr, node: nodeBase() };
}

async function pollWartscan() {
  const url = `${config.wartscanApi}/v1/accounts/balance?address=${config.faucetAddress}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`wartscan HTTP ${res.status}`);
  const text = (await res.text()).trim();
  let parsed = asAmount(text);
  if (!parsed) {
    try {
      const body = JSON.parse(text);
      parsed =
        asAmount(body?.balance) ||
        asAmount(body?.data?.balance) ||
        asAmount(body?.data?.wart?.total?.str) ||
        asAmount(body?.result);
    } catch {
      parsed = null;
    }
  }
  if (!parsed) throw new Error("unexpected wartscan balance shape");
  return { reserve: parsed, node: config.wartscanApi };
}

async function poll() {
  const errors = [];
  for (const fn of [pollWartscan, pollNode]) {
    try {
      const snap = await fn();
      last = { ...snap, checkedAt: Date.now(), error: null };
      return last;
    } catch (err) {
      errors.push(String(err?.message || err));
    }
  }
  last = { ...last, error: errors.join(" | "), checkedAt: Date.now() };
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
    if (!timer) {
      timer = setInterval(poll, config.balancePollMs);
      if (typeof timer.unref === "function") timer.unref();
    }
    const first = await poll();
    if (first.error) {
      console.error(
        `balance poll failed (will retry): ${first.error} (WARTSCAN_API=${config.wartscanApi} NODE_URL=${config.nodeUrl})`,
      );
    }
    return last;
  },
};
