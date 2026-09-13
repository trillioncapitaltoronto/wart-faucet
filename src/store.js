import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

function empty() {
  return { wallets: {}, weekStart: weekKey(Date.now()), weekSpentE8: "0", log: [] };
}

function weekKey(ms) {
  const d = new Date(ms);
  const diff = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function toE8(value) {
  const s = String(value ?? "0").trim();
  if (!/^\d+(\.\d{1,8})?$/.test(s)) return 0n;
  const [i, f = ""] = s.split(".");
  return BigInt(i) * 10n ** 8n + BigInt((f + "00000000").slice(0, 8));
}

export function fromE8(n) {
  const neg = n < 0n;
  const v = neg ? -n : n;
  const i = v / 10n ** 8n;
  const f = (v % 10n ** 8n).toString().padStart(8, "0").replace(/0+$/, "");
  const out = f ? `${i}.${f}` : `${i}`;
  return neg ? `-${out}` : out;
}

function sanitizeLog(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows.slice(0, 100)) {
    if (!r || typeof r !== "object") continue;
    const address = String(r.address || "").toLowerCase();
    const txHash = r.txHash ? String(r.txHash).toLowerCase() : null;
    const amount = String(r.amount || "");
    if (!/^[0-9a-f]{48}$/.test(address)) continue;
    if (txHash && !/^[0-9a-f]{64}$/.test(txHash)) continue;
    if (amount && !/^\d+(\.\d{1,8})?$/.test(amount)) continue;
    out.push({
      address,
      amount,
      txHash,
      createdAt: typeof r.createdAt === "string" ? r.createdAt.slice(0, 40) : "",
    });
  }
  return out;
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(config.claimsFile, "utf8"));
    return {
      wallets: raw.wallets && typeof raw.wallets === "object" ? raw.wallets : {},
      weekStart: raw.weekStart || weekKey(Date.now()),
      weekSpentE8: String(raw.weekSpentE8 ?? toE8(raw.weekSpent || 0)),
      log: sanitizeLog(raw.log),
    };
  } catch {
    return empty();
  }
}

function save(state) {
  try {
    fs.mkdirSync(path.dirname(config.claimsFile), { recursive: true });
    const tmp = `${config.claimsFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, config.claimsFile);
  } catch {
    // RAM only if the disk is read-only.
  }
}

let state = null;
function getState() {
  if (!state) state = load();
  return state;
}

function rollWeek(now = Date.now()) {
  const s = getState();
  const key = weekKey(now);
  if (s.weekStart !== key) {
    s.weekStart = key;
    s.weekSpentE8 = "0";
  }
}

function mergeDrip({ address, amount, txHash, createdAt, now = Date.now() }) {
  const s = getState();
  const wallet = String(address || "").toLowerCase();
  const hash = txHash ? String(txHash).toLowerCase() : null;
  if (!/^[0-9a-f]{48}$/.test(wallet)) return false;
  if (s.log.some((r) => r.txHash && hash && r.txHash === hash)) return false;
  s.wallets[wallet] = s.wallets[wallet] || now;
  s.log = [
    {
      address: wallet,
      amount: String(amount),
      txHash: hash,
      createdAt: createdAt || new Date(now).toISOString(),
    },
    ...(s.log || []),
  ].slice(0, 100);
  return true;
}

const inflight = new Set();

export const store = {
  tryLock(wallet) {
    if (inflight.has(wallet)) return false;
    inflight.add(wallet);
    return true;
  },
  unlock(wallet) {
    inflight.delete(wallet);
  },
  canWallet(address, now = Date.now()) {
    const ts = Number(getState().wallets[address] || 0);
    return !ts || now - ts >= config.walletWindowMs;
  },
  remainingWeekE8(now = Date.now()) {
    rollWeek(now);
    const spent = BigInt(getState().weekSpentE8 || "0");
    const cap = toE8(config.weeklyBudget);
    return cap > spent ? cap - spent : 0n;
  },
  remainingWeek(now = Date.now()) {
    return fromE8(store.remainingWeekE8(now));
  },
  record({ address, amount, txHash, now = Date.now() }) {
    const s = getState();
    rollWeek(now);
    s.wallets[address] = now;
    s.weekSpentE8 = String(BigInt(s.weekSpentE8 || "0") + toE8(amount));
    const row = {
      address,
      amount: String(amount),
      txHash: txHash || null,
      createdAt: new Date(now).toISOString(),
    };
    s.log = [row, ...(s.log || [])].slice(0, 100);
    save(s);
  },
  recent(limit = 50) {
    const n = Math.min(100, Math.max(1, Number(limit) || 50));
    return (getState().log || []).slice(0, n);
  },
  snapshot(now = Date.now()) {
    rollWeek(now);
    const s = getState();
    return {
      claimedWallets: Object.keys(s.wallets).length,
      weekStart: s.weekStart,
      weekSpent: fromE8(BigInt(s.weekSpentE8 || "0")),
      remainingThisWeek: store.remainingWeek(now),
    };
  },
  async hydrateFromChain() {
    const faucet = config.faucetAddress.toLowerCase();
    const drip = toE8(config.dripAmount);
    const url = `${config.nodeUrl.replace(/\/$/, "")}/account/${faucet}/history/999999999`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`history HTTP ${res.status}`);
    const body = await res.json();
    if (body?.code !== 0) throw new Error(`history code ${body?.code}`);
    const blocks = body?.data?.perBlock || [];
    const s = getState();
    rollWeek();
    let added = 0;
    let weekE8 = 0n;
    for (const block of blocks) {
      const transfers = block?.transactions?.transfers || [];
      for (const t of transfers) {
        const from = String(t.fromAddress || "").toLowerCase();
        const to = String(t.toAddress || "").toLowerCase();
        const amountE8 = BigInt(t.amountE8 ?? toE8(t.amount));
        if (from !== faucet) continue;
        if (amountE8 !== drip) continue;
        if (!/^[0-9a-f]{48}$/.test(to)) continue;
        weekE8 += amountE8;
        if (
          mergeDrip({
            address: to,
            amount: fromE8(amountE8),
            txHash: t.txHash,
            createdAt: block.height ? `block ${block.height}` : "",
          })
        ) {
          added += 1;
        }
      }
    }
    if (weekE8 > BigInt(s.weekSpentE8 || "0")) s.weekSpentE8 = String(weekE8);
    if (added) save(s);
    return { added, claimedWallets: Object.keys(s.wallets).length, log: s.log.length };
  },
};
