import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.js";

function empty() {
  return { wallets: {}, ips: {}, weekStart: weekKey(Date.now()), weekSpent: 0 };
}

function weekKey(ms) {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(getConfig().claimsFile, "utf8"));
    return {
      wallets: raw.wallets && typeof raw.wallets === "object" ? raw.wallets : {},
      ips: raw.ips && typeof raw.ips === "object" ? raw.ips : {},
      weekStart: raw.weekStart || weekKey(Date.now()),
      weekSpent: Number(raw.weekSpent) || 0,
    };
  } catch {
    return empty();
  }
}

function save(state) {
  try {
    const file = getConfig().claimsFile;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  } catch {
    // Serverless / read-only disk: keep RAM only.
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
    s.weekSpent = 0;
  }
}

function prune(map, windowMs, now) {
  const cutoff = now - windowMs;
  for (const [k, ts] of Object.entries(map)) {
    if (Number(ts) < cutoff) delete map[k];
  }
}

export const store = {
  canWallet(address, now = Date.now()) {
    const ts = Number(getState().wallets[address] || 0);
    return !ts || now - ts >= getConfig().walletWindowMs;
  },
  canIp(ip, now = Date.now()) {
    const cfg = getConfig();
    const s = getState();
    prune(s.ips, cfg.ipWindowMs, now);
    const hits = Object.entries(s.ips).filter(([k]) => k.startsWith(`${ip}#`) || k === ip);
    return hits.length < cfg.ipRateLimit;
  },
  remainingWeek(now = Date.now()) {
    rollWeek(now);
    return Math.max(0, getConfig().weeklyBudget - getState().weekSpent);
  },
  record({ address, ip, amount, now = Date.now() }) {
    const s = getState();
    rollWeek(now);
    s.wallets[address] = now;
    s.ips[`${ip}#${now}`] = now;
    s.weekSpent += Number(amount) || 0;
    prune(s.ips, getConfig().ipWindowMs, now);
    save(s);
  },
  snapshot(now = Date.now()) {
    rollWeek(now);
    const s = getState();
    return {
      claimedWallets: Object.keys(s.wallets).length,
      weekStart: s.weekStart,
      weekSpent: s.weekSpent,
      remainingThisWeek: store.remainingWeek(now),
    };
  },
};
