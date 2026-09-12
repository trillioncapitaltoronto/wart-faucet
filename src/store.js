import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

function empty() {
  return { wallets: {}, weekStart: weekKey(Date.now()), weekSpentE8: "0" };
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

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(config.claimsFile, "utf8"));
    return {
      wallets: raw.wallets && typeof raw.wallets === "object" ? raw.wallets : {},
      weekStart: raw.weekStart || weekKey(Date.now()),
      weekSpentE8: String(raw.weekSpentE8 ?? toE8(raw.weekSpent || 0)),
    };
  } catch {
    return empty();
  }
}

function save(state) {
  try {
    fs.mkdirSync(path.dirname(config.claimsFile), { recursive: true });
    fs.writeFileSync(config.claimsFile, JSON.stringify(state, null, 2));
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
  record({ address, amount, now = Date.now() }) {
    const s = getState();
    rollWeek(now);
    s.wallets[address] = now;
    s.weekSpentE8 = String(BigInt(s.weekSpentE8 || "0") + toE8(amount));
    save(s);
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
};
